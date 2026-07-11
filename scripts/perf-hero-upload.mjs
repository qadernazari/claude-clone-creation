#!/usr/bin/env node
/**
 * Upload a perf:hero JSON/HTML report pair to the `perf-reports` Supabase
 * Storage bucket so it shows up in the /admin/hero-perf dashboard.
 *
 * The main perf:hero check already uploads automatically when
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set. This script is for the
 * cases where auto-upload was skipped (no creds at run time, PERF_UPLOAD=0,
 * different environment) and someone wants to push an existing report to the
 * dashboard after the fact.
 *
 * Usage:
 *   node scripts/perf-hero-upload.mjs                  # upload the latest pair in REPORT_DIR
 *   node scripts/perf-hero-upload.mjs <path-to-json>   # upload a specific pair
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required)
 *   REPORT_DIR                               (default: /mnt/documents)
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const REPORT_DIR = process.env.REPORT_DIR || "/mnt/documents";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — cannot upload to the dashboard.",
  );
  process.exit(2);
}

const arg = process.argv[2];

async function resolveJsonPath() {
  if (arg) {
    if (!arg.endsWith(".json")) {
      console.error(`Expected a .json report path, got: ${arg}`);
      process.exit(2);
    }
    await stat(arg);
    return arg;
  }
  // Pick the newest perf-hero-*.json in REPORT_DIR.
  const entries = await readdir(REPORT_DIR).catch(() => []);
  const candidates = entries
    .filter((n) => /^perf-hero-.*\.json$/.test(n))
    .map((n) => join(REPORT_DIR, n));
  if (!candidates.length) {
    console.error(`No perf-hero-*.json reports found in ${REPORT_DIR}`);
    process.exit(2);
  }
  const withStat = await Promise.all(
    candidates.map(async (p) => ({ p, mtime: (await stat(p)).mtimeMs })),
  );
  withStat.sort((a, b) => b.mtime - a.mtime);
  return withStat[0].p;
}

const jsonPath = await resolveJsonPath();
const htmlPath = jsonPath.replace(/\.json$/, ".html");

// Derive `YYYY-MM-DD/perf-hero-<stamp>.<ext>` layout matching the check script.
const stampMatch = basename(jsonPath).match(/^perf-hero-(.+)\.json$/);
if (!stampMatch) {
  console.error(`Report filename does not match perf-hero-<stamp>.json: ${jsonPath}`);
  process.exit(2);
}
const stamp = stampMatch[1];
const day = stamp.slice(0, 10);

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const uploads = [
  { local: jsonPath, remote: `${day}/perf-hero-${stamp}.json`, ct: "application/json" },
];
try {
  await stat(htmlPath);
  uploads.push({ local: htmlPath, remote: `${day}/perf-hero-${stamp}.html`, ct: "text/html" });
} catch {
  console.log(`  · no companion HTML at ${htmlPath} — uploading JSON only`);
}

console.log(`Uploading report to perf-reports bucket (day=${day})…`);
let failures = 0;
for (const u of uploads) {
  const buf = await readFile(u.local);
  const { error } = await admin.storage
    .from("perf-reports")
    .upload(u.remote, buf, { contentType: u.ct, upsert: true });
  if (error) {
    failures += 1;
    console.error(`  ✗ ${u.remote}: ${error.message}`);
  } else {
    console.log(`  ✓ perf-reports/${u.remote}`);
  }
}

if (failures) {
  console.error(`\n${failures} upload(s) failed.`);
  process.exit(1);
}
console.log(`\nDone. Visit /admin/hero-perf to review the run.`);
console.log(`Source: ${dirname(jsonPath)}`);
