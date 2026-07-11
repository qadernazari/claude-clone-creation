#!/usr/bin/env node
/**
 * Hero performance regression check.
 *
 * Boots a headless Chromium at a 390px mobile viewport, loads the homepage
 * with `?hero-debug=1`, waits for the hero LCP beacon, and asserts:
 *
 *   1. NO film-thumbnails transfers occur (landscape preload must stay gated
 *      behind `(min-width: 768px)`).
 *   2. hero LCP <= LCP_BUDGET_MS (default 2000ms).
 *   3. exactly one hero cover is downloaded.
 *   4. the beacon's `preload_url` matches the rendered `<img>` src.
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node scripts/perf-hero-check.mjs
 *   LCP_BUDGET_MS=1500 node scripts/perf-hero-check.mjs
 *
 * Requires `playwright` on the PATH (it ships with the dev sandbox). In CI,
 * install with `bunx playwright install chromium` first.
 *
 * Exits 0 on pass, 1 on any failed assertion.
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const LCP_BUDGET_MS = Number(process.env.LCP_BUDGET_MS || 2000);
const VIEWPORT = { width: 390, height: 844 };
const BEACON_TIMEOUT_MS = 8000;

const failures = [];
const pass = (msg) => console.log(`✓ ${msg}`);
const fail = (msg) => {
  console.log(`✗ ${msg}`);
  failures.push(msg);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
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
    new Promise((_, r) => setTimeout(() => r(new Error("beacon timeout")), BEACON_TIMEOUT_MS)),
  ]);

  const renderedSrc = await page.evaluate(() => {
    const img = document.querySelector('main img[class*="md:hidden"]');
    return img instanceof HTMLImageElement ? img.currentSrc : null;
  });

  // Assertion 1: no landscape thumbnail bytes on mobile.
  if (thumbTransfers.length === 0) {
    pass("no film-thumbnails transfers on 390px viewport");
  } else {
    fail(
      `${thumbTransfers.length} film-thumbnails transfer(s) leaked to mobile: ` +
        thumbTransfers.map((t) => t.url).join(", "),
    );
  }

  // Assertion 2: LCP under budget.
  if (!beacon || typeof beacon.lcp_ms !== "number") {
    fail("beacon missing or malformed (no lcp_ms)");
  } else if (beacon.lcp_ms <= LCP_BUDGET_MS) {
    pass(`hero LCP ${beacon.lcp_ms}ms <= budget ${LCP_BUDGET_MS}ms`);
  } else {
    fail(`hero LCP ${beacon.lcp_ms}ms exceeds budget ${LCP_BUDGET_MS}ms`);
  }

  // Assertion 3: exactly one cover downloaded (preload should be reused by <img>).
  const uniqueCovers = new Set(coverTransfers.map((t) => t.url.split("?")[0])).size;
  if (uniqueCovers === 1) {
    pass(`one unique film-cover downloaded (${coverTransfers.length} response event(s))`);
  } else {
    fail(`expected 1 unique film-cover, got ${uniqueCovers}`);
  }

  // Assertion 4: beacon preload_url matches the rendered <img> src.
  if (beacon && renderedSrc && beacon.preload_url) {
    if (beacon.preload_url === renderedSrc) {
      pass("beacon preload_url matches rendered <img> src");
    } else {
      fail(
        `beacon preload_url (${beacon.preload_url.slice(0, 80)}…) != rendered src (${renderedSrc.slice(0, 80)}…)`,
      );
    }
  } else {
    fail("could not compare preload_url to rendered src (missing data)");
  }

  console.log("\nBeacon:", JSON.stringify(beacon, null, 2));
} catch (err) {
  fail(`run failed: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nAll hero perf regression checks passed.");
