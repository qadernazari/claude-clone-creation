import { createFileRoute } from "@tanstack/react-router";

// Compact beacon endpoint for hero LCP measurements. Logs a single line
// per submission to worker logs (queryable via `hero_perf` keyword). No DB
// write — keeps the endpoint dependency-free and cheap under bot traffic.

type Payload = {
  url?: unknown;
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

export const Route = createFileRoute("/api/public/perf/hero")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
          return new Response(null, { status: 204 });
        } catch (err) {
          console.error("hero_perf beacon error:", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
