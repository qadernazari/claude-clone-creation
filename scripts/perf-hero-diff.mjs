#!/usr/bin/env node
/**
 * Diff two perf:hero JSON reports produced by scripts/perf-hero-check.mjs.
 *
 * Usage:
 *   node scripts/perf-hero-diff.mjs <baseline.json> <candidate.json> [options]
 *
 * Options:
 *   --json                    Emit machine-readable JSON instead of a text table.
 *   --html <path>             Also write an HTML diff report to <path>.
 *   --lcp-threshold-ms <n>    Flag LCP regressions >= n ms (default 100).
 *   --lcp-threshold-pct <n>   Flag LCP regressions >= n% (default 10).
 *   --bytes-threshold <n>     Flag transfer regressions >= n bytes (default 20000).
 *   --bytes-threshold-pct <n> Flag transfer regressions >= n% (default 10).
 *   --fail-on-regression      Exit 1 if any flagged regression is found.
 *
 * The script highlights regressions in:
 *   - lcp_ms                  (per viewport)
 *   - transfer_bytes_initial  (per viewport, plus total/covers/thumbnails)
 *   - passed / failure count  (any newly failing viewport is a regression)
 *   - beacon fields           (any changed numeric/boolean beacon field is
 *                              reported; preload_cache_hit flipping from true
 *                              to false is a regression)
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
if (args.length < 2 || args.includes("-h") || args.includes("--help")) {
  console.error(
    "Usage: node scripts/perf-hero-diff.mjs <baseline.json> <candidate.json> [--json] [--html path] [--lcp-threshold-ms N] [--lcp-threshold-pct N] [--bytes-threshold N] [--bytes-threshold-pct N] [--fail-on-regression]",
  );
  process.exit(2);
}

const [baselinePath, candidatePath, ...rest] = args;
const opts = {
  json: false,
  html: null,
  lcpMs: 100,
  lcpPct: 10,
  bytesAbs: 20_000,
  bytesPct: 10,
  failOnRegression: false,
};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === "--json") opts.json = true;
  else if (a === "--fail-on-regression") opts.failOnRegression = true;
  else if (a === "--html") opts.html = rest[++i];
  else if (a === "--lcp-threshold-ms") opts.lcpMs = Number(rest[++i]);
  else if (a === "--lcp-threshold-pct") opts.lcpPct = Number(rest[++i]);
  else if (a === "--bytes-threshold") opts.bytesAbs = Number(rest[++i]);
  else if (a === "--bytes-threshold-pct") opts.bytesPct = Number(rest[++i]);
  else {
    console.error(`Unknown option: ${a}`);
    process.exit(2);
  }
}

const [baseline, candidate] = await Promise.all([
  readJson(baselinePath),
  readJson(candidatePath),
]);

async function readJson(p) {
  const raw = await readFile(resolve(p), "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON at ${p}: ${err.message}`);
    process.exit(2);
  }
}

// ANSI helpers (no dependency) — auto-disabled when not a TTY or --json.
const useColor = process.stdout.isTTY && !opts.json;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const red = (s) => c("31", s);
const green = (s) => c("32", s);
const yellow = (s) => c("33", s);
const dim = (s) => c("2", s);
const bold = (s) => c("1", s);

const fmtMs = (v) => (v == null ? "—" : `${Math.round(v)} ms`);
const fmtBytes = (v) => {
  if (v == null) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
};
const pct = (before, after) => {
  if (!before || before === 0) return null;
  return ((after - before) / before) * 100;
};

// -------- Beacon field classification --------
// Fields where a change is worth surfacing. We split them into "regression-worthy"
// (a flip in the wrong direction fails the diff) vs "informational" (changes
// are printed but never fail the diff).
const BEACON_REGRESSION_FIELDS = new Set([
  "preload_cache_hit",  // true -> false is a regression
  "delivery_type",      // "cache" -> "network" is a regression
]);
const BEACON_INFO_FIELDS = [
  "lcp_ms",
  "ttfb_ms",
  "decode_ms",
  "transfer_bytes",
  "resource_count",
  "resource_initiator",
  "delivery_type",
  "preload_cache_hit",
  "preload_url",
  "url",
  "correlation_id",
  "effective_type",
  "downlink",
  "rtt",
  "dpr",
];

function classifyBeaconChange(field, before, after) {
  if (before === after) return null;
  if (field === "preload_cache_hit") {
    if (before === true && after !== true) return "regression";
    if (before !== true && after === true) return "improvement";
    return "info";
  }
  if (field === "delivery_type") {
    // Best-effort: consider "cache"/"memory-cache"/"disk-cache" as hits.
    const isHit = (v) => typeof v === "string" && /cache/i.test(v);
    if (isHit(before) && !isHit(after)) return "regression";
    if (!isHit(before) && isHit(after)) return "improvement";
    return "info";
  }
  return "info";
}

// -------- Build per-viewport diff --------
const baseRuns = new Map((baseline.runs ?? []).map((r) => [r.viewport_key ?? r.viewport_label, r]));
const candRuns = new Map((candidate.runs ?? []).map((r) => [r.viewport_key ?? r.viewport_label, r]));
const allKeys = [...new Set([...baseRuns.keys(), ...candRuns.keys()])];

const rows = [];
const regressions = [];
const improvements = [];

for (const key of allKeys) {
  const b = baseRuns.get(key) ?? null;
  const a = candRuns.get(key) ?? null;
  const label = a?.viewport_label ?? b?.viewport_label ?? String(key);

  const row = {
    viewport_key: key,
    viewport_label: label,
    baseline_present: !!b,
    candidate_present: !!a,
    lcp: diffNumeric("lcp_ms", b?.lcp_ms, a?.lcp_ms, opts.lcpMs, opts.lcpPct, "ms"),
    transfer_initial: diffNumeric(
      "transfer_bytes_initial",
      b?.transfer_bytes_initial,
      a?.transfer_bytes_initial,
      opts.bytesAbs,
      opts.bytesPct,
      "bytes",
    ),
    transfer_total: diffNumeric(
      "transfer_bytes_total",
      b?.transfer_bytes_total,
      a?.transfer_bytes_total,
      opts.bytesAbs,
      opts.bytesPct,
      "bytes",
    ),
    passed_before: b?.passed ?? null,
    passed_after: a?.passed ?? null,
    new_failures: newFailures(b?.failures ?? [], a?.failures ?? []),
    beacon_changes: [],
  };

  // Passed regression?
  if (b?.passed === true && a?.passed === false) {
    row.passed_regression = true;
    regressions.push({
      viewport_label: label,
      kind: "run_failed",
      detail: `Viewport now failing. New failures: ${row.new_failures.join("; ") || "(none listed)"}`,
    });
  } else if (b?.passed === false && a?.passed === true) {
    improvements.push({ viewport_label: label, kind: "run_recovered" });
  }

  // Register LCP / bytes regressions
  for (const metric of [row.lcp, row.transfer_initial, row.transfer_total]) {
    if (!metric) continue;
    if (metric.regression) {
      regressions.push({
        viewport_label: label,
        kind: metric.field,
        detail: metric.summary,
      });
    } else if (metric.improvement) {
      improvements.push({ viewport_label: label, kind: metric.field, detail: metric.summary });
    }
  }

  // Beacon field diffs
  const bb = b?.beacon ?? {};
  const ab = a?.beacon ?? {};
  for (const field of BEACON_INFO_FIELDS) {
    if (!(field in bb) && !(field in ab)) continue;
    const before = bb[field];
    const after = ab[field];
    const kind = classifyBeaconChange(field, before, after);
    if (!kind) continue;
    const change = { field, before, after, kind };
    row.beacon_changes.push(change);
    if (kind === "regression" && BEACON_REGRESSION_FIELDS.has(field)) {
      regressions.push({
        viewport_label: label,
        kind: `beacon.${field}`,
        detail: `${field}: ${format(before)} → ${format(after)}`,
      });
    } else if (kind === "improvement") {
      improvements.push({
        viewport_label: label,
        kind: `beacon.${field}`,
        detail: `${field}: ${format(before)} → ${format(after)}`,
      });
    }
  }

  rows.push(row);
}

function diffNumeric(field, before, after, absThreshold, pctThreshold, unit) {
  if (before == null && after == null) return null;
  const delta = before != null && after != null ? after - before : null;
  const p = pct(before, after);
  const isRegression =
    delta != null &&
    delta > 0 &&
    delta >= absThreshold &&
    (p == null || p >= pctThreshold);
  const isImprovement =
    delta != null &&
    delta < 0 &&
    -delta >= absThreshold &&
    (p == null || -p >= pctThreshold);
  const fmt = unit === "bytes" ? fmtBytes : fmtMs;
  const parts = [`${fmt(before)} → ${fmt(after)}`];
  if (delta != null) {
    const sign = delta >= 0 ? "+" : "";
    parts.push(`Δ ${sign}${fmt(Math.abs(delta)).replace(/^-/, "")}${delta < 0 ? " (faster/smaller)" : ""}`);
    if (p != null && isFinite(p)) parts.push(`${sign}${p.toFixed(1)}%`);
  }
  return {
    field,
    before,
    after,
    delta,
    pct: p,
    regression: isRegression,
    improvement: isImprovement,
    summary: parts.join(", "),
  };
}

function newFailures(before, after) {
  const beforeSet = new Set((before ?? []).map(String));
  return (after ?? []).map(String).filter((f) => !beforeSet.has(f));
}

function format(v) {
  if (v == null) return "—";
  if (typeof v === "string" && v.length > 60) return `${v.slice(0, 57)}…`;
  return JSON.stringify(v);
}

// -------- Output --------
const summary = {
  baseline: {
    path: baselinePath,
    generated_at: baseline.generated_at ?? null,
    passed: baseline.overall_passed ?? null,
  },
  candidate: {
    path: candidatePath,
    generated_at: candidate.generated_at ?? null,
    passed: candidate.overall_passed ?? null,
  },
  thresholds: {
    lcp_ms: opts.lcpMs,
    lcp_pct: opts.lcpPct,
    bytes_abs: opts.bytesAbs,
    bytes_pct: opts.bytesPct,
  },
  regressions,
  improvements,
  rows,
};

if (opts.json) {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
} else {
  printText(summary);
}

if (opts.html) {
  await writeFile(resolve(opts.html), renderHtml(summary));
  if (!opts.json) console.error(dim(`HTML diff written to ${opts.html}`));
}

if (opts.failOnRegression && regressions.length > 0) {
  process.exit(1);
}
process.exit(0);

// -------- Text formatter --------
function printText(s) {
  const line = "─".repeat(72);
  console.log(bold("perf:hero diff"));
  console.log(`${dim("baseline ")}${s.baseline.path}  ${dim(s.baseline.generated_at ?? "")}`);
  console.log(`${dim("candidate")} ${s.candidate.path}  ${dim(s.candidate.generated_at ?? "")}`);
  console.log(
    dim(
      `thresholds: LCP ≥ ${opts.lcpMs} ms & ≥ ${opts.lcpPct}%   ·   transfer ≥ ${fmtBytes(opts.bytesAbs)} & ≥ ${opts.bytesPct}%`,
    ),
  );
  console.log(line);

  for (const row of s.rows) {
    const header = `${bold(row.viewport_label)}  ${dim(`(${row.viewport_key})`)}`;
    const runStatus =
      row.passed_before === true && row.passed_after === false
        ? red("run: PASS → FAIL")
        : row.passed_before === false && row.passed_after === true
          ? green("run: FAIL → PASS")
          : dim(`run: ${row.passed_before === true ? "PASS" : row.passed_before === false ? "FAIL" : "—"} → ${row.passed_after === true ? "PASS" : row.passed_after === false ? "FAIL" : "—"}`);
    console.log(`${header}   ${runStatus}`);

    for (const metric of [row.lcp, row.transfer_initial, row.transfer_total]) {
      if (!metric) continue;
      const label = metric.field.padEnd(24);
      const color = metric.regression ? red : metric.improvement ? green : dim;
      console.log(`  ${label} ${color(metric.summary)}`);
    }

    if (row.new_failures.length) {
      console.log(`  ${red("new failures:")}`);
      for (const f of row.new_failures) console.log(`    - ${red(f)}`);
    }

    if (row.beacon_changes.length) {
      console.log(dim("  beacon changes:"));
      for (const ch of row.beacon_changes) {
        const color = ch.kind === "regression" ? red : ch.kind === "improvement" ? green : yellow;
        console.log(`    ${ch.field.padEnd(20)} ${color(`${format(ch.before)} → ${format(ch.after)}`)}`);
      }
    }
    console.log("");
  }

  console.log(line);
  if (s.regressions.length === 0) {
    console.log(green(`No regressions above threshold. (${s.improvements.length} improvement${s.improvements.length === 1 ? "" : "s"} noted.)`));
  } else {
    console.log(red(bold(`${s.regressions.length} regression${s.regressions.length === 1 ? "" : "s"} above threshold:`)));
    for (const r of s.regressions) {
      console.log(`  ${red("•")} [${r.viewport_label}] ${r.kind}: ${r.detail}`);
    }
    if (s.improvements.length) {
      console.log(green(`Also ${s.improvements.length} improvement${s.improvements.length === 1 ? "" : "s"}.`));
    }
  }
}

// -------- HTML formatter --------
function renderHtml(s) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const badge = (kind, text) => `<span class="badge ${kind}">${esc(text)}</span>`;
  const metricCell = (m) => {
    if (!m) return `<td class="dim">—</td>`;
    const cls = m.regression ? "regression" : m.improvement ? "improvement" : "info";
    return `<td class="${cls}">${esc(m.summary)}</td>`;
  };
  const rowsHtml = s.rows
    .map((row) => {
      const runCell =
        row.passed_before === true && row.passed_after === false
          ? badge("regression", "PASS → FAIL")
          : row.passed_before === false && row.passed_after === true
            ? badge("improvement", "FAIL → PASS")
            : badge("info", `${row.passed_before ? "PASS" : row.passed_before === false ? "FAIL" : "—"} → ${row.passed_after ? "PASS" : row.passed_after === false ? "FAIL" : "—"}`);
      const beaconRows = row.beacon_changes
        .map(
          (ch) =>
            `<tr><td>${esc(ch.field)}</td><td class="${ch.kind}">${esc(format(ch.before))} → ${esc(format(ch.after))}</td></tr>`,
        )
        .join("");
      return `<section>
        <h3>${esc(row.viewport_label)} <span class="dim">(${esc(row.viewport_key)})</span> ${runCell}</h3>
        <table class="metrics">
          <tr><th>LCP</th>${metricCell(row.lcp)}</tr>
          <tr><th>Initial transfer</th>${metricCell(row.transfer_initial)}</tr>
          <tr><th>Total transfer</th>${metricCell(row.transfer_total)}</tr>
        </table>
        ${row.new_failures.length ? `<div class="regression"><strong>New failures:</strong><ul>${row.new_failures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : ""}
        ${beaconRows ? `<details open><summary>Beacon field changes (${row.beacon_changes.length})</summary><table class="beacon"><tr><th>field</th><th>before → after</th></tr>${beaconRows}</table></details>` : ""}
      </section>`;
    })
    .join("\n");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>perf:hero diff</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 2rem; color: #1f2328; }
  h1 { margin: 0 0 .25rem; }
  .dim { color: #656d76; font-weight: normal; }
  .meta { color: #656d76; margin-bottom: 1.5rem; }
  section { border: 1px solid #d0d7de; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  section h3 { margin: 0 0 .5rem; }
  table.metrics, table.beacon { border-collapse: collapse; width: 100%; margin: .5rem 0; }
  table.metrics th, table.metrics td, table.beacon th, table.beacon td { text-align: left; padding: .35rem .6rem; border-bottom: 1px solid #eaeef2; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
  table.metrics th, table.beacon th { background: #f6f8fa; width: 200px; }
  .regression { color: #cf222e; }
  .improvement { color: #1a7f37; }
  .info { color: #656d76; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; margin-left: .5rem; }
  .badge.regression { background: #ffebe9; color: #cf222e; }
  .badge.improvement { background: #dafbe1; color: #1a7f37; }
  .badge.info { background: #eaeef2; color: #57606a; }
  .summary { padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
  .summary.pass { background: #dafbe1; color: #1a7f37; }
  .summary.fail { background: #ffebe9; color: #cf222e; }
</style></head><body>
<h1>perf:hero diff</h1>
<div class="meta">
  <div><strong>baseline</strong> <code>${esc(s.baseline.path)}</code> <span class="dim">${esc(s.baseline.generated_at ?? "")}</span></div>
  <div><strong>candidate</strong> <code>${esc(s.candidate.path)}</code> <span class="dim">${esc(s.candidate.generated_at ?? "")}</span></div>
  <div class="dim">Thresholds — LCP ≥ ${opts.lcpMs} ms &amp; ≥ ${opts.lcpPct}% · transfer ≥ ${fmtBytes(opts.bytesAbs)} &amp; ≥ ${opts.bytesPct}%</div>
</div>
<div class="summary ${s.regressions.length === 0 ? "pass" : "fail"}">
  ${s.regressions.length === 0 ? `No regressions above threshold. ${s.improvements.length} improvement${s.improvements.length === 1 ? "" : "s"}.` : `<strong>${s.regressions.length} regression${s.regressions.length === 1 ? "" : "s"}:</strong><ul>${s.regressions.map((r) => `<li>[${esc(r.viewport_label)}] ${esc(r.kind)}: ${esc(r.detail)}</li>`).join("")}</ul>`}
</div>
${rowsHtml}
</body></html>`;
}
