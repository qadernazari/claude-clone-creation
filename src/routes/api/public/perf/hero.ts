import { createFileRoute } from "@tanstack/react-router";

// Compact beacon endpoint for hero LCP measurements. Logs a single line
// per submission to worker logs (queryable via `hero_perf` keyword). No DB
// write — keeps the endpoint dependency-free and cheap under bot traffic.

type Payload = {
  url?: unknown;
  correlation_id?: unknown;
  preload_url?: unknown;
  lcp_ms?: unknown;
  lcp_size?: unknown;
  req_start_ms?: unknown;
  ttfb_ms?: unknown;
  resp_end_ms?: unknown;
  transfer_bytes?: unknown;
  encoded_bytes?: unknown;
  protocol?: unknown;
  decode_ms?: unknown;
  viewport_w?: unknown;
  dpr?: unknown;
  effective_type?: unknown;
  downlink?: unknown;
  ua_mobile?: unknown;
};

function n(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function s(v: unknown, max = 200): string | null {
  return typeof v === "string" ? v.slice(0, max) : null;
}
function b(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

// Per-IP token bucket. Isolate-local (Workers keep the module scope alive
// across requests within one isolate) — under heavy multi-region traffic
// each isolate enforces its own budget, so the effective ceiling is
// PER_MIN * (isolates). Good enough to stop a single spamming client from
// flooding worker logs; a proper global limiter would need a KV/DO backend.
const PER_MIN = 30;
const WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 5000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  // Prefer Cloudflare/edge-injected client IP; fall back to XFF; else "anon".
  const cf =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    null;
  if (cf) return cf;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "anon";
}

function rateLimit(request: Request): { ok: boolean; retryAfter: number } {
  const key = clientKey(request);
  const now = Date.now();
  const entry = ipHits.get(key);
  if (!entry || entry.resetAt <= now) {
    // Simple GC when the map grows unbounded (long-lived isolate).
    if (ipHits.size >= MAX_TRACKED_IPS) {
      for (const [k, v] of ipHits) {
        if (v.resetAt <= now) ipHits.delete(k);
        if (ipHits.size < MAX_TRACKED_IPS / 2) break;
      }
    }
    ipHits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > PER_MIN) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export const Route = createFileRoute("/api/public/perf/hero")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const limit = rateLimit(request);
          if (!limit.ok) {
            return new Response("rate limited", {
              status: 429,
              headers: {
                "Retry-After": String(limit.retryAfter),
                "Cache-Control": "no-store",
              },
            });
          }

          const raw = await request.text();
          if (raw.length > 2048) {
            return new Response("payload too large", { status: 413 });
          }
          let p: Payload = {};
          try {
            p = JSON.parse(raw) as Payload;
          } catch {
            return new Response("bad json", { status: 400 });
          }

          const country =
            request.headers.get("cf-ipcountry") ??
            request.headers.get("x-vercel-ip-country") ??
            null;

          const line = {
            tag: "hero_perf",
            url: s(p.url, 300),
            lcp_ms: n(p.lcp_ms),
            lcp_size: n(p.lcp_size),
            req_start_ms: n(p.req_start_ms),
            ttfb_ms: n(p.ttfb_ms),
            resp_end_ms: n(p.resp_end_ms),
            transfer_bytes: n(p.transfer_bytes),
            encoded_bytes: n(p.encoded_bytes),
            protocol: s(p.protocol, 32),
            decode_ms: n(p.decode_ms),
            viewport_w: n(p.viewport_w),
            dpr: n(p.dpr),
            effective_type: s(p.effective_type, 16),
            downlink: n(p.downlink),
            ua_mobile: b(p.ua_mobile),
            country,
          };
          // Single-line log so it aggregates cleanly in worker logs.
          console.log(JSON.stringify(line));

          // Persist for admin charts (service role — bypasses RLS).
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const toInt = (v: number | null) =>
              v === null ? null : Math.round(v);
            await supabaseAdmin.from("hero_perf_logs").insert({
              url: line.url,
              lcp_ms: toInt(line.lcp_ms),
              lcp_size: toInt(line.lcp_size),
              ttfb_ms: toInt(line.ttfb_ms),
              resp_end_ms: toInt(line.resp_end_ms),
              transfer_bytes: toInt(line.transfer_bytes),
              encoded_bytes: toInt(line.encoded_bytes),
              protocol: line.protocol,
              decode_ms: toInt(line.decode_ms),
              viewport_w: toInt(line.viewport_w),
              dpr: line.dpr,
              effective_type: line.effective_type,
              downlink: line.downlink,
              ua_mobile: line.ua_mobile,
              country: line.country,
            });
          } catch (dbErr) {
            console.error("hero_perf insert failed:", dbErr);
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error("hero_perf beacon error:", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
