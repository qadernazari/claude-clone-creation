// Lightweight hero-image performance beacon.
//
// Runs once per page load in production. Observes the LCP entry, correlates it
// to the matching PerformanceResourceTiming, measures decode time on a
// cache-hit second decode, and beacons a compact JSON payload to
// /api/public/perf/hero which logs a single line to worker logs.
//
// Sampling keeps the beacon volume tiny even at scale. Bumped via URL query
// (?heroperf=1) for on-demand debugging without redeploying.

export type PerfPayload = {
  url: string;
  correlation_id: string | null;
  preload_url: string | null;
  lcp_ms: number;
  lcp_size: number;
  req_start_ms: number | null;
  ttfb_ms: number | null;
  resp_end_ms: number | null;
  transfer_bytes: number | null;
  encoded_bytes: number | null;
  protocol: string | null;
  decode_ms: number | null;
  viewport_w: number;
  dpr: number;
  effective_type: string | null;
  downlink: number | null;
  ua_mobile: boolean;
  delivery_type: string | null;
  preload_cache_hit: boolean | null;
  resource_initiator: string | null;
  resource_count: number | null;
};

export type MeasureHeroLCPOptions = {
  sampleRate?: number;
  correlationId?: string;
  preloadUrl?: string | null;
};

interface LcpEntry extends PerformanceEntry {
  size: number;
  url?: string;
}

declare global {
  interface Window {
    __heroPerfLast?: {
      payload: PerfPayload;
      ok: boolean;
      ts: number;
    };
  }
}


const DEFAULT_SAMPLE_RATE = 0.1;

export function measureHeroLCP(
  optsOrRate: MeasureHeroLCPOptions | number = {},
) {
  const opts: MeasureHeroLCPOptions =
    typeof optsOrRate === "number" ? { sampleRate: optsOrRate } : optsOrRate;
  const sampleRate = opts.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const correlationId =
    opts.correlationId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const preloadUrl = opts.preloadUrl ?? null;

  if (typeof window === "undefined") return;
  const forced =
    typeof window.location !== "undefined" &&
    (window.location.search.includes("heroperf=1") ||
      window.location.search.includes("hero-debug=1"));
  if (!import.meta.env.PROD && !forced) return;
  const w = window as Window & { __heroPerfSent?: boolean };
  if (w.__heroPerfSent) return;

  if (!forced && Math.random() > sampleRate) return;
  w.__heroPerfSent = true;


  let lcp: LcpEntry | null = null;
  let po: PerformanceObserver | null = null;
  try {
    po = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LcpEntry[];
      if (entries.length) lcp = entries[entries.length - 1];
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // LCP unsupported (older Safari) — bail.
    return;
  }

  const finalize = () => {
    try {
      po?.disconnect();
    } catch {
      /* noop */
    }
    if (!lcp || !lcp.url) return;
    const url = lcp.url;

    const res = performance
      .getEntriesByName(url)
      .find(
        (e): e is PerformanceResourceTiming => e.entryType === "resource",
      );

    // Enumerate all resource entries for this URL — used to detect double
    // fetches and to distinguish preload-only entries from the render fetch.
    const allEntries = performance
      .getEntriesByName(url)
      .filter((e): e is PerformanceResourceTiming => e.entryType === "resource");
    // deliveryType is Chromium-only, may be "cache", "navigational-prefetch", or "".
    const deliveryType =
      (res as PerformanceResourceTiming & { deliveryType?: string })
        ?.deliveryType ?? null;
    // Cache hit: no bytes on the wire, but the resource still delivered a body.
    // Covers memory cache, disk cache, and preload cache reuse.
    const preloadCacheHit = res
      ? res.transferSize === 0 &&
        ((res.encodedBodySize ?? 0) > 0 || (res.decodedBodySize ?? 0) > 0)
      : null;

    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; downlink?: number };
    };
    const conn = nav.connection;

    const build = (decode_ms: number | null): PerfPayload => ({
      url: url.split("?")[0],
      correlation_id: correlationId,
      preload_url: preloadUrl ? preloadUrl.split("?")[0] : null,
      lcp_ms: Math.round(lcp!.startTime),
      lcp_size: lcp!.size,
      req_start_ms: res ? Math.round(res.startTime) : null,
      ttfb_ms: res ? Math.round(res.responseStart - res.startTime) : null,
      resp_end_ms: res ? Math.round(res.responseEnd - res.startTime) : null,
      transfer_bytes: res?.transferSize ?? null,
      encoded_bytes: res?.encodedBodySize ?? null,
      protocol: res?.nextHopProtocol ?? null,
      decode_ms,
      viewport_w: window.innerWidth,
      dpr: window.devicePixelRatio,
      effective_type: conn?.effectiveType ?? null,
      downlink: conn?.downlink ?? null,
      ua_mobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
      delivery_type: deliveryType || (preloadCacheHit ? "cache" : null),
      preload_cache_hit: preloadCacheHit,
      resource_initiator: res?.initiatorType ?? null,
      resource_count: allEntries.length || null,
    });

    const send = (payload: PerfPayload) => {
      const body = JSON.stringify(payload);
      const record = (ok: boolean) => {
        try {
          window.__heroPerfLast = { payload, ok, ts: Date.now() };
        } catch {
          /* noop */
        }
      };
      try {
        if (navigator.sendBeacon) {
          const ok = navigator.sendBeacon("/api/public/perf/hero", body);
          record(ok);
          if (!ok) {
            void fetch("/api/public/perf/hero", {
              method: "POST",
              body,
              keepalive: true,
              headers: { "content-type": "application/json" },
            })
              .then(() => record(true))
              .catch(() => record(false));
          }
        } else {
          void fetch("/api/public/perf/hero", {
            method: "POST",
            body,
            keepalive: true,
            headers: { "content-type": "application/json" },
          })
            .then(() => record(true))
            .catch(() => record(false));
        }
      } catch {
        record(false);
      }
    };


    // Second-decode timing (cache hit). Not identical to first-paint decode
    // but a stable proxy for CPU cost of decoding this render at this DPR.
    try {
      const im = new Image();
      im.src = url;
      const t0 = performance.now();
      im.decode().then(
        () => send(build(Math.round(performance.now() - t0))),
        () => send(build(null)),
      );
    } catch {
      send(build(null));
    }
  };

  // Give LCP + resource entries time to settle.
  const trigger = () => setTimeout(finalize, 2000);
  if (document.readyState === "complete") {
    trigger();
  } else {
    window.addEventListener("load", trigger, { once: true });
  }
}
