// Lightweight hero-image performance beacon.
//
// Runs once per page load in production. Observes the LCP entry, correlates it
// to the matching PerformanceResourceTiming, measures decode time on a
// cache-hit second decode, and beacons a compact JSON payload to
// /api/public/perf/hero which logs a single line to worker logs.
//
// Sampling keeps the beacon volume tiny even at scale. Bumped via URL query
// (?heroperf=1) for on-demand debugging without redeploying.

type PerfPayload = {
  url: string;
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
};

interface LcpEntry extends PerformanceEntry {
  size: number;
  url?: string;
}

const DEFAULT_SAMPLE_RATE = 0.1;

export function measureHeroLCP(sampleRate: number = DEFAULT_SAMPLE_RATE) {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  const w = window as Window & { __heroPerfSent?: boolean };
  if (w.__heroPerfSent) return;

  const forced =
    typeof window.location !== "undefined" &&
    window.location.search.includes("heroperf=1");
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

    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; downlink?: number };
    };
    const conn = nav.connection;

    const build = (decode_ms: number | null): PerfPayload => ({
      url: url.split("?")[0],
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
    });

    const send = (payload: PerfPayload) => {
      const body = JSON.stringify(payload);
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/public/perf/hero", body);
        } else {
          void fetch("/api/public/perf/hero", {
            method: "POST",
            body,
            keepalive: true,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        /* noop */
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
