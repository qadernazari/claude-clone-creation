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

const REPORT_DIR = process.env.REPORT_DIR || "/mnt/documents";
const REPORT_STAMP = new Date().toISOString().replace(/[:.]/g, "-");

const totalFailures = [];
const reportRuns = [];

for (const key of selection) {
  const vp = ALL_VIEWPORTS[key];
  if (!vp) {
    console.log(`\n=== ${key} — unknown viewport, skipping ===`);
    continue;
  }
  console.log(`\n=== ${vp.label} ===`);
  const failures = [];
  const checks = [];
  const pass = (msg) => {
    console.log(`  ✓ ${msg}`);
    checks.push({ ok: true, msg });
  };
  const fail = (msg) => {
    console.log(`  ✗ ${msg}`);
    failures.push(`[${vp.label}] ${msg}`);
    checks.push({ ok: false, msg });
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
    (bucket === "film-thumbnails" ? thumbTransfers : coverTransfers).push(record);
  };

  page.on("response", (resp) => {
    const u = resp.url();
    if (u.includes("film-thumbnails")) captureTransfer(resp, "film-thumbnails");
    else if (u.includes("film-covers")) captureTransfer(resp, "film-covers");
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

  let renderedSrc = null;
  const runStart = Date.now();

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

    if (forbidTransfers.length === 0) {
      pass(`no ${vp.forbidBucket} transfers (preload gate held)`);
    } else {
      fail(
        `${forbidTransfers.length} ${vp.forbidBucket} transfer(s) leaked: ` +
          forbidTransfers.map((t) => t.url.slice(0, 100)).join(", "),
      );
    }

    if (!beacon || typeof beacon.lcp_ms !== "number") {
      fail("beacon missing or malformed (no lcp_ms)");
    } else if (beacon.lcp_ms <= LCP_BUDGET_MS) {
      pass(`hero LCP ${beacon.lcp_ms}ms <= budget ${LCP_BUDGET_MS}ms`);
    } else {
      fail(`hero LCP ${beacon.lcp_ms}ms exceeds budget ${LCP_BUDGET_MS}ms`);
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

    if (beacon && beacon.preload_url && beacon.url) {
      if (beacon.preload_url === beacon.url) {
        pass("beacon preload_url matches LCP entry url");
      } else {
        fail(
          `beacon preload_url (${beacon.preload_url.slice(0, 80)}…) != LCP url (${beacon.url.slice(0, 80)}…)`,
        );
      }
    } else {
      fail("beacon missing preload_url or url");
    }

    renderedSrc = await page.evaluate(() => {
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
      fail(`rendered hero src is NOT in ${vp.expectBucket}: ${renderedSrc.slice(0, 120)}…`);
    }
  } catch (err) {
    fail(`run failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }

  const sumBytes = (arr) =>
    arr.reduce((s, t) => s + (typeof t.bytes === "number" ? t.bytes : 0), 0);

  reportRuns.push({
    viewport_key: key,
    viewport_label: vp.label,
    viewport: { width: vp.width, height: vp.height, dpr: vp.deviceScaleFactor },
    expect_bucket: vp.expectBucket,
    forbid_bucket: vp.forbidBucket,
    started_at: new Date(runStart).toISOString(),
    duration_ms: Date.now() - runStart,
    lcp_ms: beacon?.lcp_ms ?? null,
    lcp_budget_ms: LCP_BUDGET_MS,
    transfer_bytes_total:
      sumBytes(thumbTransfers) + sumBytes(coverTransfers),
    transfer_bytes_thumbnails: sumBytes(thumbTransfers),
    transfer_bytes_covers: sumBytes(coverTransfers),
    transfers: {
      "film-thumbnails": thumbTransfers,
      "film-covers": coverTransfers,
    },
    rendered_src: renderedSrc,
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
  viewports_selected: selection,
  overall_passed: totalFailures.length === 0,
  summary: {
    runs: reportRuns.length,
    passed: reportRuns.filter((r) => r.passed).length,
    failed: reportRuns.filter((r) => !r.passed).length,
  },
  runs: reportRuns,
};

const jsonPath = path.join(REPORT_DIR, `perf-hero-${REPORT_STAMP}.json`);
const htmlPath = path.join(REPORT_DIR, `perf-hero-${REPORT_STAMP}.html`);
await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

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
            <span><strong>Transfer:</strong> ${fmtBytes(
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
${runCards}
</body></html>`;

await fs.writeFile(htmlPath, html);

console.log(`\nReports written:`);
console.log(`  JSON: ${jsonPath}`);
console.log(`  HTML: ${htmlPath}`);

if (totalFailures.length) {
  console.error(`\n${totalFailures.length} assertion(s) failed across viewports:`);
  for (const f of totalFailures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll hero perf regression checks passed across all viewports.");
