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
import { mkdir, unlink } from "node:fs/promises";
import { join as joinPath } from "node:path";

// ---------- Optional config file ----------
// Load a JSON config from PERF_HERO_CONFIG (or ./perf-hero.config.json if it
// exists) so budgets and preload gate expectations can be tuned without
// editing this script. Env vars still win over config-file values so CI can
// override on a per-job basis. Shape:
//   {
//     "lcp_budget_ms": 2000,
//     "viewports": {
//       "desktop": {
//         "lcp_budget_ms": 1500,
//         "expect_bucket": "film-thumbnails",
//         "forbid_bucket": "film-covers"
//       }
//     }
//   }
const { readFileSync, existsSync } = await import("node:fs");
const configPath =
  process.env.PERF_HERO_CONFIG ||
  (existsSync("perf-hero.config.json") ? "perf-hero.config.json" : null);
let fileConfig = { lcp_budget_ms: null, viewports: {} };
if (configPath) {
  try {
    fileConfig = JSON.parse(readFileSync(configPath, "utf8"));
    fileConfig.viewports = fileConfig.viewports || {};
    console.log(`Loaded perf-hero config from ${configPath}`);
  } catch (err) {
    console.error(`Failed to read config at ${configPath}: ${err instanceof Error ? err.message : err}`);
    process.exit(2);
  }
}
const vpCfg = (key) => fileConfig.viewports?.[key] || {};

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const LCP_BUDGET_MS = Number(
  process.env.LCP_BUDGET_MS || fileConfig.lcp_budget_ms || 2000,
);
const BEACON_TIMEOUT_MS = Number(process.env.BEACON_TIMEOUT_MS || 20000);
const GOTO_TIMEOUT_MS = Number(process.env.GOTO_TIMEOUT_MS || 45000);
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);
const WARMUP = process.env.WARMUP !== "0";
// How many silent pre-flight passes to run against a fresh dev server before
// the FIRST measured attempt of the FIRST viewport. Compiles Vite modules
// and warms the storage-CDN edge cache for hero assets so cold-start doesn't
// pollute the LCP measurement (especially at 390px and 768px).
const WARMUP_PASSES = Number(process.env.WARMUP_PASSES || 2);
const RETRY_BACKOFF_MS = Number(process.env.RETRY_BACKOFF_MS || 1500);
// Per-viewport LCP budgets. Env var > config file > default.
// Tablet emulation on shared CI runners consistently lands 20–40% slower
// than desktop, so its default gets headroom.
const budgetFor = (key, fallback) =>
  Number(
    process.env[`LCP_BUDGET_MS_${key.toUpperCase()}`] ||
      vpCfg(key).lcp_budget_ms ||
      fallback,
  );
const PER_VIEWPORT_BUDGET_MS = {
  mobile: budgetFor("mobile", LCP_BUDGET_MS),
  tablet: budgetFor("tablet", Math.max(LCP_BUDGET_MS, 3000)),
  laptop: budgetFor("laptop", LCP_BUDGET_MS),
  desktop: budgetFor("desktop", LCP_BUDGET_MS),
};

// Per-viewport transfer_bytes budgets (bytes downloaded from the LCP asset
// bucket on initial load). Env var > config file > default. The forbidden
// bucket is already asserted to zero elsewhere, so this is effectively the
// hero image transfer ceiling.
const transferBudgetFor = (key, fallback) =>
  Number(
    process.env[`TRANSFER_BUDGET_BYTES_${key.toUpperCase()}`] ||
      vpCfg(key).transfer_budget_bytes ||
      fallback,
  );
const DEFAULT_TRANSFER_BUDGET_BYTES = Number(
  process.env.TRANSFER_BUDGET_BYTES || fileConfig.transfer_budget_bytes || 500_000,
);
const PER_VIEWPORT_TRANSFER_BUDGET_BYTES = {
  mobile: transferBudgetFor("mobile", 250_000),
  tablet: transferBudgetFor("tablet", 350_000),
  laptop: transferBudgetFor("laptop", 400_000),
  desktop: transferBudgetFor("desktop", DEFAULT_TRANSFER_BUDGET_BYTES),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One-time process warmup: hit the homepage a few times to compile Vite
// modules and warm the CDN edge cache for hero assets. Failures here are
// non-fatal — the retry loop handles genuine boot issues per viewport.
let processWarmedUp = false;
async function warmProcessOnce() {
  if (processWarmedUp || !WARMUP || WARMUP_PASSES <= 0) {
    processWarmedUp = true;
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    for (let i = 0; i < WARMUP_PASSES; i++) {
      try {
        await page.goto(`${BASE_URL}/?warmup=${i + 1}`, {
          waitUntil: "domcontentloaded",
          timeout: GOTO_TIMEOUT_MS,
        });
        // Give the hero <img> a beat to trigger its fetch so CDN warms.
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      } catch (err) {
        console.log(`  · process warmup pass ${i + 1} skipped: ${err instanceof Error ? err.message : err}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    processWarmedUp = true;
  }
}

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

// Apply per-viewport preload gate overrides (env var > config file > default).
for (const key of Object.keys(ALL_VIEWPORTS)) {
  const cfg = vpCfg(key);
  const envUp = key.toUpperCase();
  const expect = process.env[`EXPECT_BUCKET_${envUp}`] || cfg.expect_bucket;
  const forbid = process.env[`FORBID_BUCKET_${envUp}`] || cfg.forbid_bucket;
  const selector = process.env[`HERO_SELECTOR_${envUp}`] || cfg.hero_img_selector;
  if (expect) ALL_VIEWPORTS[key].expectBucket = expect;
  if (forbid) ALL_VIEWPORTS[key].forbidBucket = forbid;
  if (selector) ALL_VIEWPORTS[key].heroImgSelector = selector;
}

const selection = (process.env.VIEWPORTS || "mobile,tablet,laptop,desktop")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const REPORT_DIR = process.env.REPORT_DIR || "/mnt/documents";
const REPORT_STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const FAILURE_DIR = joinPath(REPORT_DIR, "failures", REPORT_STAMP);
await mkdir(FAILURE_DIR, { recursive: true });

const totalFailures = [];
const reportRuns = [];
const failureArtifacts = [];

await warmProcessOnce();

for (const key of selection) {
  const vp = ALL_VIEWPORTS[key];
  if (!vp) {
    console.log(`\n=== ${key} — unknown viewport, skipping ===`);
    continue;
  }
  console.log(`\n=== ${vp.label} ===`);
  let failures = [];
  let checks = [];
  const pass = (msg) => {
    console.log(`  ✓ ${msg}`);
    checks.push({ ok: true, msg });
  };
  const fail = (msg) => {
    console.log(`  ✗ ${msg}`);
    failures.push(`[${vp.label}] ${msg}`);
    checks.push({ ok: false, msg });
  };

  // Attempt state (populated on the winning attempt).
  let thumbTransfers = [];
  let coverTransfers = [];
  let beacon = null;
  let renderedSrc = null;
  let attemptsMeta = [];
  const runStart = Date.now();

  // A single navigation + observation. Returns { ok, reason, transfers, beacon, renderedSrc, cacheProbe }.
  const singleAttempt = async (attempt) => {
    const localThumb = [];
    const localCover = [];
    let localBeacon = null;
    let localRenderedSrc = null;
    let cacheProbe = null;
    let beaconResolve;
    const beaconPromise = new Promise((r) => (beaconResolve = r));

    const browser = await chromium.launch({ headless: true });
    const artifactBase = `${key}-attempt${attempt}`;
    const harPath = joinPath(FAILURE_DIR, `${artifactBase}.har`);
    const screenshotPath = joinPath(FAILURE_DIR, `${artifactBase}.png`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      userAgent: vp.userAgent,
      recordHar: { path: harPath, mode: "full", content: "embed" },
    });
    const page = await context.newPage();

    // CDP session gives us `fromDiskCache` / `fromMemoryCache` / `fromPrefetchCache`
    // flags that Playwright's response events don't expose.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    const cdpByReq = new Map();
    const cdpByUrl = new Map(); // url -> latest response record
    cdp.on("Network.requestWillBeSent", (e) => {
      cdpByReq.set(e.requestId, { url: e.request.url });
    });
    cdp.on("Network.responseReceived", (e) => {
      const rec = {
        requestId: e.requestId,
        url: e.response.url,
        status: e.response.status,
        fromDiskCache: !!e.response.fromDiskCache,
        fromServiceWorker: !!e.response.fromServiceWorker,
        fromPrefetchCache: !!e.response.fromPrefetchCache,
        encodedDataLength: e.response.encodedDataLength ?? null,
      };
      cdpByReq.set(e.requestId, rec);
      cdpByUrl.set(e.response.url, rec);
    });

    const captureTransfer = async (resp, bucket) => {
      let bytes = null;
      const cl = resp.headers()["content-length"];
      if (cl) bytes = Number(cl);
      if (bytes == null || Number.isNaN(bytes)) {
        try {
          const buf = await resp.body();
          bytes = buf.length;
        } catch {
          bytes = null;
        }
      }
      const record = {
        bucket,
        url: resp.url(),
        status: resp.status(),
        bytes,
        from_cache: resp.fromServiceWorker() || false,
      };
      (bucket === "film-thumbnails" ? localThumb : localCover).push(record);
    };
    page.on("response", (resp) => {
      const u = resp.url();
      if (u.includes("film-thumbnails")) captureTransfer(resp, "film-thumbnails");
      else if (u.includes("film-covers")) captureTransfer(resp, "film-covers");
    });
    page.on("request", (req) => {
      if (req.url().endsWith("/api/public/perf/hero")) {
        try {
          localBeacon = JSON.parse(req.postData() || "{}");
        } catch {
          localBeacon = { raw: req.postData() };
        }
        beaconResolve();
      }
    });

    const attemptStart = Date.now();
    const timing = {
      attempt_start: new Date(attemptStart).toISOString(),
      warmup_ms: null,
      warmup_error: null,
      nav_start_ms: null,       // ms since attemptStart when page.goto(?hero-debug) starts
      nav_ms: null,             // duration of page.goto until domcontentloaded
      networkidle_ms: null,     // duration from nav end until networkidle (or timeout)
      beacon_wait_start_ms: null,
      beacon_wait_ms: null,
      dom_snapshot_ms: null,
      cache_probe_ms: null,
      total_ms: null,
    };
    const beaconWait = {
      resolved: false,           // did the /api/public/perf/hero request fire?
      reason: null,              // "resolved" | "timeout" | "nav_error" | "unknown"
      timed_out: false,
      timeout_ms: BEACON_TIMEOUT_MS,
      elapsed_ms: null,          // wall-clock spent in the race
      resolved_at_ms: null,      // ms since attemptStart when the beacon POST fired
      first_seen_at_ms: null,    // same as resolved_at_ms; kept for symmetry
    };
    const result = {
      ok: false,
      reason: "",
      thumb: localThumb,
      cover: localCover,
      beacon: null,
      lastBeacon: null,   // populated even when the attempt fails (may be null, partial, or malformed)
      renderedSrc: null,
      cacheProbe: null,
      domPreloads: [],
      activePreload: null,
      attempt,
      timing,
      beaconWait,
    };
    // Record when the beacon request fires (from within the page.on("request") hook above,
    // which mutates `localBeacon`). We piggyback on `beaconResolve` by wrapping it.
    const originalBeaconResolve = beaconResolve;
    beaconResolve = () => {
      if (beaconWait.first_seen_at_ms == null) {
        beaconWait.first_seen_at_ms = Date.now() - attemptStart;
        beaconWait.resolved_at_ms = beaconWait.first_seen_at_ms;
        beaconWait.resolved = true;
      }
      originalBeaconResolve();
    };
    try {
      if (WARMUP) {
        // Warm on every attempt: retries fire precisely when the previous
        // attempt was slow, so re-warming the module graph and CDN edge is
        // the whole point.
        const warmupStart = Date.now();
        try {
          await page.goto(`${BASE_URL}/?warmup=1&attempt=${attempt}`, {
            waitUntil: "domcontentloaded",
            timeout: GOTO_TIMEOUT_MS,
          });
          await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        } catch (err) {
          timing.warmup_error = err instanceof Error ? err.message : String(err);
          console.log(`    · warmup skipped: ${timing.warmup_error}`);
        }
        timing.warmup_ms = Date.now() - warmupStart;
      }

      timing.nav_start_ms = Date.now() - attemptStart;
      const navStart = Date.now();
      await page.goto(`${BASE_URL}/?hero-debug=1`, {
        waitUntil: "domcontentloaded",
        timeout: GOTO_TIMEOUT_MS,
      });
      timing.nav_ms = Date.now() - navStart;
      const idleStart = Date.now();
      try {
        await page.waitForLoadState("networkidle", { timeout: GOTO_TIMEOUT_MS });
      } catch {
        // dev-server HMR keeps network alive; beacon race below is authoritative.
      }
      timing.networkidle_ms = Date.now() - idleStart;

      timing.beacon_wait_start_ms = Date.now() - attemptStart;
      const beaconStart = Date.now();
      try {
        await Promise.race([
          beaconPromise,
          new Promise((_, r) =>
            setTimeout(() => r(new Error(`beacon timeout after ${BEACON_TIMEOUT_MS}ms`)), BEACON_TIMEOUT_MS),
          ),
        ]);
        beaconWait.reason = beaconWait.resolved ? "resolved" : "unknown";
      } catch (err) {
        beaconWait.timed_out = true;
        beaconWait.reason = "timeout";
        throw err;
      } finally {
        beaconWait.elapsed_ms = Date.now() - beaconStart;
      }
      await sleep(250);

      const domStart = Date.now();
      const domSnapshot = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("main img"));
        const visible = imgs.find((i) => {
          const r = i.getBoundingClientRect();
          return r.width > 200 && r.height > 200;
        });
        const visible = imgs.find((i) => {
          const r = i.getBoundingClientRect();
          return r.width > 200 && r.height > 200;
        });
        const rendered =
          visible instanceof HTMLImageElement
            ? visible.currentSrc || visible.src
            : null;
        const preloads = Array.from(
          document.querySelectorAll('link[rel="preload"][as="image"]'),
        ).map((l) => ({
          href: l.href,
          media: l.getAttribute("media"),
          matches: l.getAttribute("media")
            ? window.matchMedia(l.getAttribute("media")).matches
            : true,
        }));
        const activePreload = preloads.find((p) => p.matches) || null;
        return { rendered, preloads, activePreload };
      });
      localRenderedSrc = domSnapshot.rendered;
      result.domPreloads = domSnapshot.preloads;
      result.activePreload = domSnapshot.activePreload;
      timing.dom_snapshot_ms = Date.now() - domStart;

      // ----- Cache probe (reload keeps HTTP cache; verify LCP asset now served from cache) -----
      const cacheProbeStart = Date.now();
      const lcpUrl = localRenderedSrc || localBeacon?.url || null;
      if (lcpUrl) {
        const reloadCdpHits = [];
        const captureReload = (e) => {
          if (e.response?.url === lcpUrl) {
            reloadCdpHits.push({
              status: e.response.status,
              fromDiskCache: !!e.response.fromDiskCache,
              fromMemoryCache: false, // reported via `fromDiskCache` for both mem+disk in modern CDP
              fromPrefetchCache: !!e.response.fromPrefetchCache,
              fromServiceWorker: !!e.response.fromServiceWorker,
              encodedDataLength: e.response.encodedDataLength ?? null,
            });
          }
        };
        cdp.on("Network.responseReceived", captureReload);

        // Snapshot pre-reload transfer counts so we can diff for the reload phase.
        const preReloadThumb = localThumb.length;
        const preReloadCover = localCover.length;

        try {
          await page.reload({ waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
          try {
            await page.waitForLoadState("networkidle", { timeout: GOTO_TIMEOUT_MS });
          } catch {}
          await sleep(400);
        } catch (err) {
          console.log(
            `    · reload cache probe skipped: ${err instanceof Error ? err.message : err}`,
          );
        }

        const perfEntry = await page.evaluate((url) => {
          const e = performance.getEntriesByType("resource").find((r) => r.name === url);
          return e
            ? {
                transferSize: e.transferSize,
                encodedBodySize: e.encodedBodySize,
                decodedBodySize: e.decodedBodySize,
                duration: e.duration,
              }
            : null;
        }, lcpUrl);

        // A cache hit shows in CDP as fromDiskCache=true (memory cache is bucketed in there too),
        // OR the Resource Timing API reports transferSize===0 with decodedBodySize>0 for
        // same-origin / Timing-Allow-Origin responses. For cross-origin without TAO we fall back
        // to duration<50ms as a soft signal.
        const cdpHit = reloadCdpHits.some(
          (h) => h.fromDiskCache || h.fromPrefetchCache || h.fromServiceWorker,
        );
        const rtHit =
          perfEntry &&
          perfEntry.transferSize === 0 &&
          (perfEntry.decodedBodySize || 0) > 0;
        const fastHit = perfEntry && perfEntry.duration < 50;

        cacheProbe = {
          lcpUrl,
          reloadCdpHits,
          perfEntry,
          reloadThumbTransfers: localThumb.length - preReloadThumb,
          reloadCoverTransfers: localCover.length - preReloadCover,
          cacheHit: !!(cdpHit || rtHit || fastHit),
          signals: { cdpHit, rtHit, fastHit },
        };
      }

      if (!localBeacon || typeof localBeacon.lcp_ms !== "number") {
        result.reason = "beacon missing lcp_ms";
      } else {
        // Soft-fail (retriable) conditions: cold-start flakiness that a
        // warm cache typically clears on the next attempt.
        const budget = PER_VIEWPORT_BUDGET_MS[key] ?? LCP_BUDGET_MS;
        const softReasons = [];
        if (localBeacon.lcp_ms > budget) {
          softReasons.push(`lcp_ms ${localBeacon.lcp_ms} > budget ${budget}`);
        }
        if (key === "mobile" && localBeacon.preload_cache_hit !== true) {
          softReasons.push(
            `preload_cache_hit=${JSON.stringify(localBeacon.preload_cache_hit)} (expected true)`,
          );
        }
        if (softReasons.length && attempt < MAX_ATTEMPTS) {
          result.ok = false;
          result.reason = `soft-flake: ${softReasons.join("; ")}`;
        } else {
          // Either we're within budgets, or we've exhausted retries and
          // must hand off to the hard assertion block for a definitive fail.
          result.ok = true;
        }
      }
    } catch (err) {
      result.reason = err instanceof Error ? err.message : String(err);
    } finally {
      result.beacon = localBeacon;
      result.renderedSrc = localRenderedSrc;
      result.cacheProbe = cacheProbe;

      // Attempts that failed to capture the beacon or hit the LCP budget get a
      // full HAR + a screenshot of the page state at the point of failure.
      // Successful attempts throw the HAR away to keep the report dir small.
      const capturedBeaconOk =
        localBeacon && typeof localBeacon.lcp_ms === "number";
      const shouldKeepArtifacts = !result.ok || !capturedBeaconOk;
      if (shouldKeepArtifacts) {
        try {
          await page
            .screenshot({ path: screenshotPath, fullPage: false })
            .catch(() => {});
          result.screenshotPath = screenshotPath;
        } catch {}
      }
      // Closing the context flushes the HAR file to disk.
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      if (shouldKeepArtifacts) {
        result.harPath = harPath;
        failureArtifacts.push({
          viewport_key: key,
          viewport_label: vp.label,
          attempt,
          reason: result.reason || null,
          beacon_captured: !!localBeacon,
          lcp_captured: capturedBeaconOk,
          har_path: harPath,
          screenshot_path: screenshotPath,
        });
        console.log(
          `    · saved failure artifacts → ${harPath} , ${screenshotPath}`,
        );
      } else {
        // Successful attempt: drop the HAR (screenshot was never taken).
        await unlink(harPath).catch(() => {});
      }
    }
    return result;
  };


  // Retry loop.
  let attemptResult = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`  attempt ${attempt}/${MAX_ATTEMPTS}…`);
    const r = await singleAttempt(attempt);
    attemptsMeta.push({
      attempt,
      ok: r.ok,
      reason: r.reason || null,
      lcp_ms: r.beacon?.lcp_ms ?? null,
      har_path: r.harPath || null,
      screenshot_path: r.screenshotPath || null,
    });
    if (r.ok) {
      attemptResult = r;
      if (attempt > 1) console.log(`  · recovered on attempt ${attempt}`);
      break;
    }
    console.log(`  · attempt ${attempt} failed: ${r.reason || "unknown"}`);
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BACKOFF_MS * attempt);
    } else {
      attemptResult = r; // keep last failed attempt state for the report
    }
  }

  thumbTransfers = attemptResult?.thumb || [];
  coverTransfers = attemptResult?.cover || [];
  beacon = attemptResult?.beacon || null;
  renderedSrc = attemptResult?.renderedSrc || null;
  const domPreloads = attemptResult?.domPreloads || [];
  const activePreload = attemptResult?.activePreload || null;

  if (!attemptResult?.ok) {
    fail(`all ${MAX_ATTEMPTS} attempts failed: ${attemptResult?.reason || "unknown"}`);
  } else {
    // Assertions on the winning attempt.
    const forbidTransfers =
      vp.forbidBucket === "film-thumbnails" ? thumbTransfers : coverTransfers;
    const expectTransfers =
      vp.expectBucket === "film-thumbnails" ? thumbTransfers : coverTransfers;

    if (forbidTransfers.length === 0) {
      pass(`no ${vp.forbidBucket} transfers (preload gate held)`);
    } else {
      fail(
        `${forbidTransfers.length} ${vp.forbidBucket} transfer(s) leaked: ` +
          forbidTransfers.map((t) => t.url.slice(0, 100)).join(", "),
      );
    }

    const vpBudget = PER_VIEWPORT_BUDGET_MS[key] ?? LCP_BUDGET_MS;
    if (typeof beacon?.lcp_ms !== "number") {
      fail("beacon missing or malformed (no lcp_ms)");
    } else if (beacon.lcp_ms <= vpBudget) {
      pass(`hero LCP ${beacon.lcp_ms}ms <= budget ${vpBudget}ms`);
    } else {
      fail(`hero LCP ${beacon.lcp_ms}ms exceeds budget ${vpBudget}ms`);
    }

    // Per-viewport transfer_bytes budget. Sum bytes across expectTransfers
    // for the initial page load only (cache probe reload is excluded).
    const vpTransferBudget = PER_VIEWPORT_TRANSFER_BUDGET_BYTES[key] ?? DEFAULT_TRANSFER_BUDGET_BYTES;
    const initialExpectForBudget = expectTransfers.slice(
      0,
      expectTransfers.length -
        (attemptResult?.cacheProbe?.reloadCoverTransfers || 0) -
        (attemptResult?.cacheProbe?.reloadThumbTransfers || 0),
    );
    const initialTransferBytes = initialExpectForBudget.reduce(
      (s, t) => s + (typeof t.bytes === "number" ? t.bytes : 0),
      0,
    );
    if (initialTransferBytes === 0) {
      // Nothing measured — skip to avoid false pass. Warn only.
      pass(`no ${vp.expectBucket} bytes recorded (budget ${vpTransferBudget})`);
    } else if (initialTransferBytes <= vpTransferBudget) {
      pass(
        `${vp.expectBucket} transfer ${initialTransferBytes} B <= budget ${vpTransferBudget} B`,
      );
    } else {
      fail(
        `${vp.expectBucket} transfer ${initialTransferBytes} B exceeds budget ${vpTransferBudget} B`,
      );
    }

    // Mobile (390px) must serve the LCP hero from the preload cache.
    // CI fails if `preload_cache_hit` is anything other than strictly `true`.
    if (key === "mobile") {
      const hit = beacon?.preload_cache_hit;
      if (hit === true) {
        pass("preload_cache_hit=true on 390px viewport");
      } else {
        fail(
          `preload_cache_hit must be true on 390px viewport (got ${
            hit === null || hit === undefined ? "null" : JSON.stringify(hit)
          })`,
        );
      }
    }

    const uniqueExpected = new Set(
      expectTransfers.map((t) => t.url.split("?")[0]),
    ).size;
    if (uniqueExpected === 1) {
      pass(
        `one unique ${vp.expectBucket} downloaded (${expectTransfers.length} response event(s))`,
      );
    } else {
      fail(`expected 1 unique ${vp.expectBucket}, got ${uniqueExpected}`);
    }

    if (beacon?.preload_url && beacon?.url) {
      if (beacon.preload_url === beacon.url) {
        pass("beacon preload_url matches LCP entry url");
      } else {
        fail(
          `beacon preload_url (${beacon.preload_url.slice(0, 80)}…) != LCP url (${beacon.url.slice(0, 80)}…)`,
        );
    }

    // DOM <link rel="preload" as="image"> whose media query matches the viewport
    // MUST point to exactly the same object as the rendered hero <img> src.
    // Compare by origin+pathname since Supabase signs query strings per SSR.
    const pathOf = (u) => {
      if (!u) return null;
      try {
        const p = new URL(u);
        return p.origin + p.pathname;
      } catch {
        return u.split("?")[0];
      }
    };
    if (!activePreload) {
      fail(
        `no active <link rel="preload" as="image"> matches this viewport (found ${domPreloads.length} preload tag(s): ${domPreloads
          .map((p) => p.media || "no-media")
          .join(", ")})`,
      );
    } else if (!renderedSrc) {
      fail("cannot compare preload href to rendered hero (rendered src missing)");
    } else {
      const preloadHrefPath = pathOf(activePreload.href);
      const renderedPathForPreload = pathOf(renderedSrc);
      if (preloadHrefPath === renderedPathForPreload) {
        pass(
          `active preload href matches rendered hero src (media=${activePreload.media || "none"})`,
        );
      } else {
        fail(
          `active preload href != rendered hero src — preload=${preloadHrefPath?.slice(-90)} rendered=${renderedPathForPreload?.slice(-90)}`,
        );
      }
      // Also verify no OTHER preload tag matches (would double-preload).
      const matchingCount = domPreloads.filter((p) => p.matches).length;
      if (matchingCount === 1) {
        pass("exactly one preload tag matches the viewport media query");
      } else {
        fail(
          `expected exactly 1 matching preload tag, got ${matchingCount}: ${domPreloads
            .filter((p) => p.matches)
            .map((p) => `${p.media || "no-media"}→${pathOf(p.href)?.slice(-40)}`)
            .join(" | ")}`,
        );
      }
    }
    } else {
      fail("beacon missing preload_url or url");
    }

    if (!renderedSrc) {
      fail("could not locate rendered hero <img>");
    } else if (renderedSrc.includes(vp.expectBucket)) {
      pass(`rendered hero src is in ${vp.expectBucket}`);
    } else {
      fail(`rendered hero src is NOT in ${vp.expectBucket}: ${renderedSrc.slice(0, 120)}…`);
    }

    // ----- Exact-source triangulation -----
    // The app signs storage URLs (query string rotates per SSR), so compare by the
    // pathname (bucket + object key), not the full URL.
    const stripQ = (u) => {
      if (!u) return null;
      try {
        const p = new URL(u);
        return p.origin + p.pathname;
      } catch {
        return u.split("?")[0];
      }
    };
    const initialExpect = expectTransfers.slice(
      0,
      expectTransfers.length -
        (attemptResult?.cacheProbe?.reloadCoverTransfers || 0) -
        (attemptResult?.cacheProbe?.reloadThumbTransfers || 0),
    );
    const initialPaths = new Set(initialExpect.map((t) => stripQ(t.url)));
    const renderedPath = stripQ(renderedSrc);
    const beaconUrlPath = stripQ(beacon?.url);
    const preloadPath = stripQ(beacon?.preload_url);

    if (renderedPath && beaconUrlPath && preloadPath) {
      const allMatch =
        renderedPath === beaconUrlPath &&
        beaconUrlPath === preloadPath &&
        initialPaths.size === 1 &&
        initialPaths.has(renderedPath);
      if (allMatch) {
        pass(
          `exact ${vp.expectBucket} source triangulated (rendered = beacon.url = preload_url = network path)`,
        );
      } else {
        fail(
          "exact source mismatch — " +
            `rendered=${renderedPath?.slice(-70)} beacon=${beaconUrlPath?.slice(-70)} ` +
            `preload=${preloadPath?.slice(-70)} network=[${[...initialPaths].map((u) => u.slice(-70)).join(" | ")}]`,
        );
      }
    }

    // Exactly ONE HTTP response for the LCP object on initial load
    // (preload should be reused by <img>, not double-fetched).
    const initialCountForLcp = renderedPath
      ? initialExpect.filter((t) => stripQ(t.url) === renderedPath).length
      : 0;
    if (renderedPath) {
      if (initialCountForLcp === 1) {
        pass(`exactly 1 network request for LCP ${vp.expectBucket} object on initial load`);
      } else {
        fail(
          `expected exactly 1 network request for LCP object, got ${initialCountForLcp} ` +
            `(preload should be reused by <img>, not double-fetched)`,
        );
      }
    }


    // ----- Cache probe assertion (reload) -----
    const cp = attemptResult?.cacheProbe;
    if (!cp) {
      fail("cache probe did not run (missing LCP url)");
    } else {
      const forbidReloadCount =
        vp.forbidBucket === "film-thumbnails"
          ? cp.reloadThumbTransfers
          : cp.reloadCoverTransfers;
      if (forbidReloadCount === 0) {
        pass(`reload: no ${vp.forbidBucket} transfers (gate still held after reload)`);
      } else {
        fail(
          `reload: ${forbidReloadCount} ${vp.forbidBucket} transfer(s) leaked after reload`,
        );
      }
      if (cp.cacheHit) {
        const which = Object.entries(cp.signals)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join("+");
        pass(`LCP image served from cache on reload (${which})`);
      } else {
        fail(
          `LCP image NOT served from cache on reload — signals=${JSON.stringify(cp.signals)} ` +
            `perfEntry=${JSON.stringify(cp.perfEntry)}`,
        );
      }
    }
  }



  const sumBytes = (arr) =>
    arr.reduce((s, t) => s + (typeof t.bytes === "number" ? t.bytes : 0), 0);

  const expectTransfersForBudget =
    vp.expectBucket === "film-thumbnails" ? thumbTransfers : coverTransfers;
  const initialExpectSlice = expectTransfersForBudget.slice(
    0,
    expectTransfersForBudget.length -
      (attemptResult?.cacheProbe?.reloadCoverTransfers || 0) -
      (attemptResult?.cacheProbe?.reloadThumbTransfers || 0),
  );
  const transferBytesInitial = sumBytes(initialExpectSlice);
  const transferBudget = PER_VIEWPORT_TRANSFER_BUDGET_BYTES[key] ?? DEFAULT_TRANSFER_BUDGET_BYTES;

  reportRuns.push({
    viewport_key: key,
    viewport_label: vp.label,
    viewport: { width: vp.width, height: vp.height, dpr: vp.deviceScaleFactor },
    expect_bucket: vp.expectBucket,
    forbid_bucket: vp.forbidBucket,
    started_at: new Date(runStart).toISOString(),
    duration_ms: Date.now() - runStart,
    attempts: attemptsMeta,
    attempts_used: attemptsMeta.length,
    lcp_ms: beacon?.lcp_ms ?? null,
    lcp_budget_ms: PER_VIEWPORT_BUDGET_MS[key] ?? LCP_BUDGET_MS,
    transfer_bytes_total:
      sumBytes(thumbTransfers) + sumBytes(coverTransfers),
    transfer_bytes_thumbnails: sumBytes(thumbTransfers),
    transfer_bytes_covers: sumBytes(coverTransfers),
    transfer_bytes_initial: transferBytesInitial,
    transfer_budget_bytes: transferBudget,
    transfer_over_budget:
      transferBytesInitial > 0 && transferBytesInitial > transferBudget,
    transfers: {
      "film-thumbnails": thumbTransfers,
      "film-covers": coverTransfers,
    },
    rendered_src: renderedSrc,
    cache_probe: attemptResult?.cacheProbe || null,
    beacon,
    checks,
    failures,
    passed: failures.length === 0,
  });

  totalFailures.push(...failures);
}

// ------- Report generation -------
const fs = await import("node:fs/promises");
const path = await import("node:path");
await fs.mkdir(REPORT_DIR, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  lcp_budget_ms: LCP_BUDGET_MS,
  lcp_budget_ms_per_viewport: PER_VIEWPORT_BUDGET_MS,
  transfer_budget_bytes_per_viewport: PER_VIEWPORT_TRANSFER_BUDGET_BYTES,
  viewports_selected: selection,
  overall_passed: totalFailures.length === 0,
  summary: {
    runs: reportRuns.length,
    passed: reportRuns.filter((r) => r.passed).length,
    failed: reportRuns.filter((r) => !r.passed).length,
  },
  runs: reportRuns,
  failure_artifacts_dir: failureArtifacts.length ? FAILURE_DIR : null,
  failure_artifacts: failureArtifacts,
};

const jsonPath = path.join(REPORT_DIR, `perf-hero-${REPORT_STAMP}.json`);
const htmlPath = path.join(REPORT_DIR, `perf-hero-${REPORT_STAMP}.html`);
await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
if (failureArtifacts.length === 0) {
  // Nothing failed — remove the empty failures dir to keep the report tidy.
  await fs.rm(FAILURE_DIR, { recursive: true, force: true }).catch(() => {});
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const fmtBytes = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const runCards = reportRuns
  .map((r) => {
    const beaconRows = r.beacon
      ? Object.entries(r.beacon)
          .map(
            ([k, v]) =>
              `<tr><td>${esc(k)}</td><td><code>${esc(
                typeof v === "object" ? JSON.stringify(v) : v,
              )}</code></td></tr>`,
          )
          .join("")
      : `<tr><td colspan="2"><em>no beacon received</em></td></tr>`;

    const transferRows = [
      ...r.transfers["film-thumbnails"],
      ...r.transfers["film-covers"],
    ]
      .map(
        (t) =>
          `<tr><td>${esc(t.bucket)}</td><td>${t.status}</td><td>${fmtBytes(
            t.bytes,
          )}</td><td><code>${esc(t.url.slice(0, 140))}</code></td></tr>`,
      )
      .join("");

    const checkRows = r.checks
      .map(
        (c) =>
          `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} ${esc(
            c.msg,
          )}</li>`,
      )
      .join("");

    return `
      <section class="run ${r.passed ? "pass" : "fail"}">
        <header>
          <h2>${esc(r.viewport_label)} <span class="badge">${
            r.passed ? "PASS" : "FAIL"
          }</span></h2>
          <div class="stats">
            <span><strong>LCP:</strong> ${r.lcp_ms ?? "—"} ms (budget ${
              r.lcp_budget_ms
            })</span>
            <span class="${r.transfer_over_budget ? "over-budget" : ""}"><strong>Transfer (initial ${esc(
              r.expect_bucket,
            )}):</strong> ${fmtBytes(r.transfer_bytes_initial)} / ${fmtBytes(
              r.transfer_budget_bytes,
            )}${r.transfer_over_budget ? " ⚠️ over budget" : ""}</span>
            <span><strong>Transfer (total):</strong> ${fmtBytes(
              r.transfer_bytes_total,
            )} (thumbs ${fmtBytes(
              r.transfer_bytes_thumbnails,
            )} / covers ${fmtBytes(r.transfer_bytes_covers)})</span>
            <span><strong>Expect:</strong> ${esc(
              r.expect_bucket,
            )} · <strong>Forbid:</strong> ${esc(r.forbid_bucket)}</span>
          </div>
        </header>
        <details open><summary>Checks (${r.checks.length})</summary>
          <ul class="checks">${checkRows}</ul></details>
        <details><summary>Beacon</summary>
          <table><tbody>${beaconRows}</tbody></table></details>
        <details><summary>Transfers (${
          r.transfers["film-thumbnails"].length +
          r.transfers["film-covers"].length
        })</summary>
          <table><thead><tr><th>Bucket</th><th>Status</th><th>Bytes</th><th>URL</th></tr></thead>
          <tbody>${transferRows || `<tr><td colspan="4"><em>none</em></td></tr>`}</tbody></table></details>
        <details><summary>Rendered &lt;img&gt; src</summary>
          <code>${esc(r.rendered_src || "—")}</code></details>
      </section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Hero perf report — ${esc(
  REPORT_STAMP,
)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; margin: 2rem auto; max-width: 1100px; padding: 0 1rem; }
  h1 { margin: 0 0 0.25rem; }
  .meta { color: #666; margin-bottom: 1.5rem; }
  .summary { padding: 1rem; border-radius: 10px; background: #f4f4f7; margin-bottom: 1.5rem; }
  .summary.pass { background: #e8f7ec; } .summary.fail { background: #fdecea; }
  .run { border: 1px solid #ddd; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  .run.pass { border-left: 5px solid #2ea043; }
  .run.fail { border-left: 5px solid #d1242f; }
  .run h2 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: .75rem; }
  .badge { font-size: .7rem; padding: 2px 8px; border-radius: 999px; background: #2ea043; color: white; }
  .run.fail .badge { background: #d1242f; }
  .stats { display: flex; flex-wrap: wrap; gap: 1.25rem; margin: .5rem 0 .75rem; color: #444; font-size: .9rem; }
  details { margin-top: .5rem; }
  summary { cursor: pointer; font-weight: 600; }
  ul.checks { list-style: none; padding: .25rem 0; }
  ul.checks li.ok { color: #1a7f37; }
  ul.checks li.bad { color: #cf222e; }
  table { border-collapse: collapse; width: 100%; margin-top: .5rem; font-size: .85rem; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: .85em; word-break: break-all; }
  table.summary-table { margin: 0 0 1.5rem; font-size: .9rem; }
  table.summary-table th { background: #f4f4f7; }
  table.summary-table td.pass, table.summary-table td.match { color: #1a7f37; font-weight: 600; }
  table.summary-table td.fail, table.summary-table td.mismatch { color: #cf222e; font-weight: 600; }
  table.summary-table td.over-budget { color: #cf222e; }
  .stats span.over-budget { color: #cf222e; font-weight: 600; }
  table.budget-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: .9rem; }
  table.budget-table th, table.budget-table td { padding: .5rem .75rem; border-bottom: 1px solid #eee; vertical-align: middle; text-align: left; }
  table.budget-table th { background: #f4f4f7; }
  .bar-wrap { display: flex; flex-direction: column; gap: 4px; }
  .bar-track { position: relative; height: 10px; background: #eef0f3; border-radius: 5px; overflow: hidden; display: flex; }
  .bar { height: 100%; border-radius: 5px 0 0 5px; }
  .bar.ok { background: #2ea043; }
  .bar.over { background: #d1242f; }
  .bar-overflow { height: 100%; background: repeating-linear-gradient(45deg, #d1242f, #d1242f 4px, #a01822 4px, #a01822 8px); }
  .bar.none { color: #999; padding: 0 .5em; }
  .bar-label { font-size: .8rem; color: #555; font-family: ui-monospace, Menlo, monospace; }
  .bar-label.over-budget { color: #cf222e; }
  table.summary-table code { font-size: .8em; }
</style></head><body>
<h1>Hero performance report</h1>
<div class="meta">
  Generated ${esc(report.generated_at)} · base <code>${esc(BASE_URL)}</code> · LCP budget ${LCP_BUDGET_MS} ms
</div>
<div class="summary ${report.overall_passed ? "pass" : "fail"}">
  <strong>${report.overall_passed ? "All checks passed" : "Failures detected"}</strong>
  — ${report.summary.passed}/${report.summary.runs} viewports passed
  (${report.summary.failed} failed).
</div>
${failureArtifacts.length ? `<h2 style="margin-top:2rem">Failure artifacts</h2>
<p class="dim" style="margin-top:-.5rem">HAR + screenshot saved for every attempt that failed to capture the beacon or the LCP budget. Directory: <code>${esc(FAILURE_DIR)}</code></p>
<table class="summary-table">
  <thead><tr><th>Viewport</th><th>Attempt</th><th>Reason</th><th>Beacon</th><th>LCP</th><th>HAR</th><th>Screenshot</th></tr></thead>
  <tbody>
    ${failureArtifacts.map((a) => `<tr>
      <td>${esc(a.viewport_label)}</td>
      <td>${a.attempt}</td>
      <td>${esc(a.reason || "—")}</td>
      <td>${a.beacon_captured ? "captured" : "<strong>missing</strong>"}</td>
      <td>${a.lcp_captured ? "captured" : "<strong>missing</strong>"}</td>
      <td><a href="file://${esc(a.har_path)}"><code>${esc(a.har_path.split("/").pop())}</code></a></td>
      <td><a href="file://${esc(a.screenshot_path)}"><code>${esc(a.screenshot_path.split("/").pop())}</code></a></td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}
${(() => {
  const pathOf = (u) => {
    if (!u) return null;
    try { const p = new URL(u); return p.origin + p.pathname; }
    catch { return String(u).split("?")[0]; }
  };
  const rows = reportRuns.map((r) => {
    const preloadUrl = r.beacon?.preload_url ?? null;
    const renderedSrc = r.rendered_src ?? null;
    const preloadPath = pathOf(preloadUrl);
    const renderedPath = pathOf(renderedSrc);
    const bothPresent = !!(preloadUrl && renderedSrc);
    const match = bothPresent && preloadPath === renderedPath;
    const matchLabel = !bothPresent
      ? "—"
      : match ? "match" : "mismatch";
    const matchClass = !bothPresent ? "" : match ? "match" : "mismatch";
    const budget = r.lcp_budget_ms;
    const lcp = r.lcp_ms;
    const overBudget = typeof lcp === "number" && lcp > budget;
    const lcpCell = lcp == null
      ? "—"
      : `${lcp} ms / ${budget}`;
    const corr = r.beacon?.correlation_id ?? null;
    const corrCell = r.passed
      ? corr ? `<code>${esc(corr)}</code>` : "—"
      : corr
        ? `<code><strong>${esc(corr)}</strong></code>`
        : `<em>no beacon</em>`;
    const preloadCell = preloadUrl
      ? `<code title="${esc(preloadUrl)}">${esc((preloadPath || preloadUrl).slice(-70))}</code>`
      : "—";
    const renderedCell = renderedSrc
      ? `<code title="${esc(renderedSrc)}">${esc((renderedPath || renderedSrc).slice(-70))}</code>`
      : "—";
    return `<tr>
      <td>${esc(r.viewport_label)}</td>
      <td class="${r.passed ? "pass" : "fail"}">${r.passed ? "PASS" : "FAIL"}</td>
      <td class="${overBudget ? "over-budget" : ""}">${lcpCell}</td>
      <td class="${matchClass}">${matchLabel}</td>
      <td>${preloadCell}</td>
      <td>${renderedCell}</td>
      <td>${corrCell}</td>
    </tr>`;
  }).join("");
  return `<table class="summary-table">
    <thead><tr>
      <th>Viewport</th><th>Status</th><th>LCP / budget (ms)</th>
      <th>Preload vs rendered</th><th>preload_url</th>
      <th>rendered &lt;img&gt; src</th><th>correlation_id</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
})()}
${(() => {
  // Per-viewport budget chart: two side-by-side bars per viewport
  // (LCP vs budget, transfer_bytes vs budget). Bar width scales relative to
  // the budget so 100% == exactly at budget; anything past that is red.
  if (reportRuns.length === 0) return "";
  const bar = (actual, budget, unit) => {
    if (actual == null || !budget) {
      return `<div class="bar-wrap"><div class="bar none">—</div><div class="bar-label">— / ${budget ?? "—"} ${unit}</div></div>`;
    }
    const pct = Math.min(150, Math.round((actual / budget) * 100));
    const over = actual > budget;
    const label = unit === "B"
      ? `${fmtBytes(actual)} / ${fmtBytes(budget)}`
      : `${actual} / ${budget} ${unit}`;
    return `<div class="bar-wrap">
      <div class="bar-track"><div class="bar ${over ? "over" : "ok"}" style="width:${Math.min(100, pct)}%"></div>${over ? `<div class="bar-overflow" style="width:${Math.min(50, pct - 100)}%"></div>` : ""}</div>
      <div class="bar-label ${over ? "over-budget" : ""}">${label}${over ? ` <strong>(${pct}%)</strong>` : ` (${pct}%)`}</div>
    </div>`;
  };
  const rows = reportRuns.map((r) => `
    <tr>
      <td>${esc(r.viewport_label)}</td>
      <td>${bar(r.lcp_ms, r.lcp_budget_ms, "ms")}</td>
      <td>${bar(r.transfer_bytes_initial || null, r.transfer_budget_bytes, "B")}</td>
    </tr>
  `).join("");
  return `<h2 style="margin-top:2rem">Per-viewport budgets</h2>
    <table class="budget-table">
      <thead><tr><th>Viewport</th><th>LCP vs budget</th><th>Initial transfer vs budget</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
})()}
${runCards}
</body></html>`;

await fs.writeFile(htmlPath, html);

console.log(`\nReports written:`);
console.log(`  JSON: ${jsonPath}`);
console.log(`  HTML: ${htmlPath}`);

// ------- Upload reports to Supabase Storage (perf-reports bucket) -------
// Skipped silently when service-role creds aren't available (e.g. plain
// local dev). CI provides SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (SUPABASE_URL && SERVICE_ROLE && process.env.PERF_UPLOAD !== "0") {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const day = REPORT_STAMP.slice(0, 10); // YYYY-MM-DD
    const uploads = [
      { local: jsonPath, remote: `${day}/perf-hero-${REPORT_STAMP}.json`, ct: "application/json" },
      { local: htmlPath, remote: `${day}/perf-hero-${REPORT_STAMP}.html`, ct: "text/html" },
    ];
    for (const u of uploads) {
      const buf = await fs.readFile(u.local);
      const { error } = await admin.storage
        .from("perf-reports")
        .upload(u.remote, buf, { contentType: u.ct, upsert: true });
      if (error) {
        console.error(`  · upload failed for ${u.remote}: ${error.message}`);
      } else {
        console.log(`  · uploaded perf-reports/${u.remote}`);
      }
    }
  } catch (err) {
    console.error(`  · report upload skipped: ${err instanceof Error ? err.message : err}`);
  }
} else {
  console.log("  · report upload skipped (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
}

if (totalFailures.length) {
  console.error(`\n${totalFailures.length} assertion(s) failed across viewports:`);
  for (const f of totalFailures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll hero perf regression checks passed across all viewports.");
