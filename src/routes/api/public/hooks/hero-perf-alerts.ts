import { createFileRoute } from "@tanstack/react-router";

const SITE_ORIGIN = "https://ir.show";

// Thresholds
const LCP_P75_BUDGET_MS = 2500;
const CACHE_HIT_MIN_RATE = 0.8;
const WINDOW_MINUTES = 30;
const COOLDOWN_MINUTES = 30;
const MIN_SAMPLES = 5;

const VP_BUCKETS = [
  { key: "mobile", min: 0, max: 767 },
  { key: "tablet", min: 768, max: 1023 },
  { key: "laptop", min: 1024, max: 1439 },
  { key: "desktop", min: 1440, max: Number.POSITIVE_INFINITY },
] as const;

type BucketKey = (typeof VP_BUCKETS)[number]["key"];

function bucketOf(w: number | null): BucketKey | null {
  if (w == null) return null;
  for (const b of VP_BUCKETS) if (w >= b.min && w <= b.max) return b.key;
  return null;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

type Row = {
  lcp_ms: number | null;
  viewport_w: number | null;
  preload_cache_hit: boolean | null;
};

type Breach = {
  bucket: BucketKey;
  kind: "lcp" | "cache_hit" | "both";
  lcpP75Ms: number | null;
  cacheHitRate: number | null;
  sampleCount: number;
};

async function send(
  template: string,
  to: string,
  idempotencyKey: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return false;
  try {
    const res = await fetch(`${SITE_ORIGIN}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: template,
        recipientEmail: to,
        idempotencyKey,
        templateData: data,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("hero-perf-alerts send failed:", e);
    return false;
  }
}

async function evaluate() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowMs = Date.now();
  const since = new Date(nowMs - WINDOW_MINUTES * 60_000).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from("hero_perf_logs")
    .select("lcp_ms, viewport_w, preload_cache_hit")
    .gte("created_at", since)
    .limit(10_000);
  if (error) {
    console.error("hero-perf-alerts fetch failed:", error.message);
    return { ok: false, error: error.message };
  }

  const byBucket = new Map<BucketKey, Row[]>();
  for (const r of (rows ?? []) as Row[]) {
    const b = bucketOf(r.viewport_w);
    if (!b) continue;
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(r);
  }

  const breaches: Breach[] = [];
  const evaluations: Array<{
    bucket: BucketKey;
    lcpP75Ms: number | null;
    cacheHitRate: number | null;
    sampleCount: number;
  }> = [];

  for (const { key } of VP_BUCKETS) {
    const list = byBucket.get(key) ?? [];
    const sampleCount = list.length;
    if (sampleCount < MIN_SAMPLES) {
      evaluations.push({ bucket: key, lcpP75Ms: null, cacheHitRate: null, sampleCount });
      continue;
    }
    const lcps = list.map((r) => r.lcp_ms).filter((v): v is number => v != null).sort((a, b) => a - b);
    const lcpP75 = percentile(lcps, 75);
    const cacheDenom = list.filter((r) => r.preload_cache_hit != null).length;
    const cacheHits = list.filter((r) => r.preload_cache_hit === true).length;
    const cacheHitRate = cacheDenom > 0 ? cacheHits / cacheDenom : null;
    evaluations.push({ bucket: key, lcpP75Ms: lcpP75, cacheHitRate, sampleCount });

    const lcpBad = lcpP75 != null && lcpP75 > LCP_P75_BUDGET_MS;
    const cacheBad = cacheHitRate != null && cacheHitRate < CACHE_HIT_MIN_RATE;
    if (!lcpBad && !cacheBad) continue;
    const kind: Breach["kind"] = lcpBad && cacheBad ? "both" : lcpBad ? "lcp" : "cache_hit";
    breaches.push({ bucket: key, kind, lcpP75Ms: lcpP75, cacheHitRate, sampleCount });
  }

  if (breaches.length === 0) {
    return { ok: true, breaches: 0, evaluations };
  }

  // Cooldown: skip breaches that were already alerted (same bucket+kind or 'both')
  // within COOLDOWN_MINUTES.
  const cooldownSince = new Date(nowMs - COOLDOWN_MINUTES * 60_000).toISOString();
  const { data: recentAlerts } = await supabaseAdmin
    .from("hero_perf_alerts")
    .select("viewport_bucket, alert_kind, created_at")
    .gte("created_at", cooldownSince);
  const suppressed = new Set(
    (recentAlerts ?? []).map((a) => `${a.viewport_bucket}:${a.alert_kind}`),
  );
  const fireable = breaches.filter((b) => {
    // 'both' suppresses lcp+cache_hit and vice versa.
    if (suppressed.has(`${b.bucket}:${b.kind}`)) return false;
    if (b.kind === "lcp" && suppressed.has(`${b.bucket}:both`)) return false;
    if (b.kind === "cache_hit" && suppressed.has(`${b.bucket}:both`)) return false;
    if (b.kind === "both") {
      if (
        suppressed.has(`${b.bucket}:lcp`) &&
        suppressed.has(`${b.bucket}:cache_hit`)
      )
        return false;
    }
    return true;
  });

  if (fireable.length === 0) {
    return { ok: true, breaches: breaches.length, fired: 0, evaluations, reason: "cooldown" };
  }

  // Resolve admin recipients from user_roles + profiles.
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminIds = (admins ?? []).map((r) => r.user_id).filter(Boolean);
  let recipients: string[] = [];
  if (adminIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("id", adminIds);
    recipients = Array.from(
      new Set((profs ?? []).map((p) => p.email).filter((e): e is string => !!e)),
    );
  }

  if (recipients.length === 0) {
    console.warn("hero-perf-alerts: no admin recipients configured");
  }

  const stamp = Math.floor(nowMs / (COOLDOWN_MINUTES * 60_000));
  let sent = 0;
  for (const recipient of recipients) {
    const ok = await send(
      "hero-perf-alert",
      recipient,
      `hero-perf-alert-${stamp}-${recipient}`,
      {
        windowMinutes: WINDOW_MINUTES,
        breaches: fireable,
        dashboardUrl: `${SITE_ORIGIN}/admin/hero-perf`,
      },
    );
    if (ok) sent += 1;
  }

  // Log each fired breach so the cooldown window is respected next run.
  const logRows = fireable.map((b) => ({
    viewport_bucket: b.bucket,
    alert_kind: b.kind,
    lcp_p75_ms: b.lcpP75Ms,
    cache_hit_rate: b.cacheHitRate,
    sample_count: b.sampleCount,
    window_minutes: WINDOW_MINUTES,
    recipients,
    detail: { evaluations },
  }));
  const { error: logErr } = await supabaseAdmin.from("hero_perf_alerts").insert(logRows);
  if (logErr) console.error("hero-perf-alerts log insert failed:", logErr.message);

  return {
    ok: true,
    breaches: breaches.length,
    fired: fireable.length,
    sent,
    recipients: recipients.length,
    evaluations,
  };
}

function authorize(request: Request): Response | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const apikey = request.headers.get("apikey") ?? "";
  if (token === serviceKey || apikey === serviceKey) return null;
  // Accept the anon/publishable key for pg_cron callers, since /api/public/*
  // bypasses edge auth anyway.
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (publishable && (token === publishable || apikey === publishable)) return null;
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export const Route = createFileRoute("/api/public/hooks/hero-perf-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorize(request);
        if (denied) return denied;
        return Response.json(await evaluate());
      },
      GET: async ({ request }) => {
        const denied = authorize(request);
        if (denied) return denied;
        return Response.json(await evaluate());
      },
    },
  },
});
