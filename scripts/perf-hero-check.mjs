#!/usr/bin/env node
/**
 * Hero performance regression check — multi-viewport.
 *
 * Boots headless Chromium at three viewports (mobile / small-desktop / desktop)
 * and, on each, loads the homepage with `?hero-debug=1`, waits for the LCP
 * beacon, and asserts:
 *
 *   1. Only the expected asset bucket is downloaded for that viewport:
 *      - mobile (<768px): NO `film-thumbnails` bytes (landscape preload gated).
 *      - desktop (>=768px): NO `film-covers` bytes (portrait preload gated).
 *   2. Hero LCP <= LCP_BUDGET_MS (default 2000ms).
 *   3. Exactly one hero image is downloaded (preload reused by <img>).
 *   4. Beacon's `preload_url` matches the LCP entry `url`.
 *   5. The rendered hero <img> src matches the expected bucket for the viewport.
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node scripts/perf-hero-check.mjs
 *   LCP_BUDGET_MS=1500 node scripts/perf-hero-check.mjs
 *   VIEWPORTS=mobile,desktop node scripts/perf-hero-check.mjs
 *
 * Exits 0 on pass, 1 on any failed assertion (across all viewports).
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const LCP_BUDGET_MS = Number(process.env.LCP_BUDGET_MS || 2000);
const BEACON_TIMEOUT_MS = 8000;

const ALL_VIEWPORTS = {
  mobile: {
    label: "mobile (390px)",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    // Preload gates: portrait active (<768px), landscape gated.
    expectBucket: "film-covers",
    forbidBucket: "film-thumbnails",
    heroImgSelector: 'main img[class*="md:hidden"]',
  },
  tablet: {
    label: "tablet (768px)",
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
    // At the (min-width: 768px) breakpoint the landscape preload activates.
    expectBucket: "film-thumbnails",
    forbidBucket: "film-covers",
    heroImgSelector: 'main img[class*="hidden md:block"], main img.hidden.md\\:block',
  },
  laptop: {
    label: "laptop (1024px)",
    width: 1024,
    height: 800,
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
    expectBucket: "film-thumbnails",
    forbidBucket: "film-covers",
    heroImgSelector: 'main img[class*="hidden md:block"], main img.hidden.md\\:block',
  },
  desktop: {
    label: "desktop (1440px)",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
    expectBucket: "film-thumbnails",
    forbidBucket: "film-covers",
    heroImgSelector: 'main img[class*="hidden md:block"], main img.hidden.md\\:block',
  },
};

const selection = (process.env.VIEWPORTS || "mobile,tablet,laptop,desktop")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const totalFailures = [];

for (const key of selection) {
  const vp = ALL_VIEWPORTS[key];
  if (!vp) {
    console.log(`\n=== ${key} — unknown viewport, skipping ===`);
    continue;
  }
  console.log(`\n=== ${vp.label} ===`);
  const failures = [];
  const pass = (msg) => console.log(`  ✓ ${msg}`);
  const fail = (msg) => {
    console.log(`  ✗ ${msg}`);
    failures.push(`[${vp.label}] ${msg}`);
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    userAgent: vp.userAgent,
  });
  const page = await context.newPage();

  const thumbTransfers = [];
  const coverTransfers = [];
  let beacon = null;
  let beaconResolve;
  const beaconPromise = new Promise((r) => (beaconResolve = r));

  page.on("response", (resp) => {
    const u = resp.url();
    if (u.includes("film-thumbnails")) {
      thumbTransfers.push({ url: u.slice(0, 160), status: resp.status() });
    } else if (u.includes("film-covers")) {
      coverTransfers.push({ url: u.slice(0, 160), status: resp.status() });
    }
  });

  page.on("request", (req) => {
    if (req.url().endsWith("/api/public/perf/hero")) {
      try {
        beacon = JSON.parse(req.postData() || "{}");
      } catch {
        beacon = { raw: req.postData() };
      }
      beaconResolve();
    }
  });

  try {
    await page.goto(`${BASE_URL}/?hero-debug=1`, { waitUntil: "networkidle" });
    await Promise.race([
      beaconPromise,
      new Promise((_, r) =>
        setTimeout(() => r(new Error("beacon timeout")), BEACON_TIMEOUT_MS),
      ),
    ]);

    const forbidTransfers =
      vp.forbidBucket === "film-thumbnails" ? thumbTransfers : coverTransfers;
    const expectTransfers =
      vp.expectBucket === "film-thumbnails" ? thumbTransfers : coverTransfers;

    // 1. Forbidden bucket must have zero transfers.
    if (forbidTransfers.length === 0) {
      pass(`no ${vp.forbidBucket} transfers (preload gate held)`);
    } else {
      fail(
        `${forbidTransfers.length} ${vp.forbidBucket} transfer(s) leaked: ` +
          forbidTransfers.map((t) => t.url).join(", "),
      );
    }

    // 2. LCP under budget.
    if (!beacon || typeof beacon.lcp_ms !== "number") {
      fail("beacon missing or malformed (no lcp_ms)");
    } else if (beacon.lcp_ms <= LCP_BUDGET_MS) {
      pass(`hero LCP ${beacon.lcp_ms}ms <= budget ${LCP_BUDGET_MS}ms`);
    } else {
      fail(`hero LCP ${beacon.lcp_ms}ms exceeds budget ${LCP_BUDGET_MS}ms`);
    }

    // 3. Exactly one expected-bucket image downloaded.
    const uniqueExpected = new Set(
      expectTransfers.map((t) => t.url.split("?")[0]),
    ).size;
    if (uniqueExpected === 1) {
      pass(
        `one unique ${vp.expectBucket} downloaded ` +
          `(${expectTransfers.length} response event(s))`,
      );
    } else {
      fail(
        `expected 1 unique ${vp.expectBucket}, got ${uniqueExpected}`,
      );
    }

    // 4. Beacon preload_url matches LCP url.
    if (beacon && beacon.preload_url && beacon.url) {
      if (beacon.preload_url === beacon.url) {
        pass("beacon preload_url matches LCP entry url");
      } else {
        fail(
          `beacon preload_url (${beacon.preload_url.slice(0, 80)}…) ` +
            `!= LCP url (${beacon.url.slice(0, 80)}…)`,
        );
      }
    } else {
      fail("beacon missing preload_url or url");
    }

    // 5. Rendered <img> src is in the expected bucket.
    const renderedSrc = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("main img"));
      const visible = imgs.find((i) => {
        const r = i.getBoundingClientRect();
        return r.width > 200 && r.height > 200;
      });
      return visible instanceof HTMLImageElement
        ? visible.currentSrc || visible.src
        : null;
    });
    if (!renderedSrc) {
      fail("could not locate rendered hero <img>");
    } else if (renderedSrc.includes(vp.expectBucket)) {
      pass(`rendered hero src is in ${vp.expectBucket}`);
    } else {
      fail(
        `rendered hero src is NOT in ${vp.expectBucket}: ${renderedSrc.slice(0, 120)}…`,
      );
    }
  } catch (err) {
    fail(`run failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }

  totalFailures.push(...failures);
}

if (totalFailures.length) {
  console.error(`\n${totalFailures.length} assertion(s) failed across viewports:`);
  for (const f of totalFailures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll hero perf regression checks passed across all viewports.");
