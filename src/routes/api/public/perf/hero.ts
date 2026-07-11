import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Compact beacon endpoint for hero LCP measurements. Logs a single line
// per submission to worker logs (queryable via `hero_perf` keyword). Also
// persists to hero_perf_logs when the payload passes schema validation.

// Zod schema for the beacon body. Required fields must be present and
// well-typed; optional fields are coerced/nullable so old client builds
// keep working while we tighten the contract. Malformed payloads are
// rejected with 422 and never touch the DB.
const nonNegNumber = z.number().finite().min(0);

const beaconSchema = z
  .object({
    // Required identifying / core measurement fields.
    url: z.string().url().max(300),
    correlation_id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9._:-]+$/, "correlation_id has invalid characters"),
    lcp_ms: nonNegNumber.max(120_000),

    // Optional preload/render context.
    preload_url: z.string().url().max(300).nullish(),
    lcp_size: nonNegNumber.max(50_000_000).nullish(),
    req_start_ms: z.number().finite().nullish(),
    ttfb_ms: nonNegNumber.max(120_000).nullish(),
    resp_end_ms: z.number().finite().nullish(),
    transfer_bytes: nonNegNumber.max(50_000_000).nullish(),
    encoded_bytes: nonNegNumber.max(50_000_000).nullish(),
    protocol: z.string().max(32).nullish(),
    decode_ms: nonNegNumber.max(120_000).nullish(),

    // Optional device / network / viewport metadata.
    viewport_w: z.number().int().min(0).max(10_000).nullish(),
    dpr: z.number().finite().min(0).max(10).nullish(),
    effective_type: z.string().max(16).nullish(),
    downlink: z.number().finite().min(0).max(10_000).nullish(),
    ua_mobile: z.boolean().nullish(),

    // Optional preload-diagnostic fields.
    delivery_type: z.string().max(32).nullish(),
    preload_cache_hit: z.boolean().nullish(),
    resource_initiator: z.string().max(32).nullish(),
    resource_count: z.number().int().min(0).max(10_000).nullish(),
  })
  .strict();

type Beacon = z.infer<typeof beaconSchema>;



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
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return new Response("bad json", { status: 400 });
          }

          const result = beaconSchema.safeParse(parsed);
          if (!result.success) {
            // Log a compact rejection line so schema drift is visible in
            // worker logs without leaking the full payload.
            const issues = result.error.issues.slice(0, 5).map((i) => ({
              path: i.path.join("."),
              code: i.code,
              message: i.message.slice(0, 120),
            }));
            console.warn(
              JSON.stringify({ tag: "hero_perf_reject", reason: "schema", issues }),
            );
            return new Response(
              JSON.stringify({ error: "invalid payload", issues }),
              {
                status: 422,
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                },
              },
            );
          }
          const p: Beacon = result.data;

          const country =
            request.headers.get("cf-ipcountry") ??
            request.headers.get("x-vercel-ip-country") ??
            null;

          const nn = <T,>(v: T | null | undefined): T | null =>
            v === undefined ? null : v;

          const line = {
            tag: "hero_perf",
            url: p.url,
            correlation_id: p.correlation_id,
            preload_url: nn(p.preload_url),
            lcp_ms: p.lcp_ms,
            lcp_size: nn(p.lcp_size),
            req_start_ms: nn(p.req_start_ms),
            ttfb_ms: nn(p.ttfb_ms),
            resp_end_ms: nn(p.resp_end_ms),
            transfer_bytes: nn(p.transfer_bytes),
            encoded_bytes: nn(p.encoded_bytes),
            protocol: nn(p.protocol),
            decode_ms: nn(p.decode_ms),
            viewport_w: nn(p.viewport_w),
            dpr: nn(p.dpr),
            effective_type: nn(p.effective_type),
            downlink: nn(p.downlink),
            ua_mobile: nn(p.ua_mobile),
            delivery_type: nn(p.delivery_type),
            preload_cache_hit: nn(p.preload_cache_hit),
            resource_initiator: nn(p.resource_initiator),
            resource_count: nn(p.resource_count),
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
              correlation_id: line.correlation_id,
              preload_url: line.preload_url,
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
              delivery_type: line.delivery_type,
              preload_cache_hit: line.preload_cache_hit,
              resource_initiator: line.resource_initiator,
              resource_count: toInt(line.resource_count),
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
