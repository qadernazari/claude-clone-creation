import { useEffect, useState } from "react";

type Candidate = { name: string; url: string | null | undefined };

type DiagEntry = {
  name: string;
  url: string;
  loaded: boolean;
  transferSize: number;
  encodedBodySize: number;
  durationMs: number;
};

export function useHeroDebugEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const urlEnabled = window.location.search.includes("hero-debug=1");
      const lsEnabled = window.localStorage.getItem("heroDebug") === "1";
      setEnabled(urlEnabled || lsEnabled);
      if (urlEnabled) {
        window.localStorage.setItem("heroDebug", "1");
      }
    } catch {
      /* noop */
    }
  }, []);
  return enabled;
}

export function HeroImageDebug({ candidates }: { candidates: Candidate[] }) {
  const [entries, setEntries] = useState<DiagEntry[]>([]);
  const [viewport, setViewport] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setViewport(window.innerWidth);

    const valid = candidates.filter((c): c is { name: string; url: string } => !!c.url);
    const targets = valid.map((c) => c.url.split("?")[0]);
    const seen = new Set<string>();
    const collected: PerformanceResourceTiming[] = [];

    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const r = e as PerformanceResourceTiming;
          const base = r.name.split("?")[0];
          if (targets.includes(base) && !seen.has(base)) {
            seen.add(base);
            collected.push(r);
          }
        }
      });
      po.observe({ type: "resource", buffered: true });
    } catch {
      /* PerformanceObserver unsupported — fall back to final scan */
    }

    const finalize = () => {
      try {
        po?.disconnect();
      } catch {
        /* noop */
      }
      for (const r of performance.getEntriesByType("resource")) {
        const base = r.name.split("?")[0];
        if (targets.includes(base) && !seen.has(base)) {
          seen.add(base);
          collected.push(r as PerformanceResourceTiming);
        }
      }
      const rows = valid.map((c) => {
        const r = collected.find((r) => r.name.split("?")[0] === c.url.split("?")[0]);
        return {
          name: c.name,
          url: c.url,
          loaded: !!r,
          transferSize: r?.transferSize ?? 0,
          encodedBodySize: r?.encodedBodySize ?? 0,
          durationMs: r ? Math.round(r.responseEnd - r.startTime) : 0,
        };
      });
      setEntries(rows);
      console.groupCollapsed(`[hero-debug] ${rows.filter((r) => r.loaded).length}/${rows.length} candidates fetched`);
      console.table(
        rows.map((r) => ({
          candidate: r.name,
          loaded: r.loaded ? "yes" : "no",
          transferSize: formatBytes(r.transferSize),
          encodedBodySize: formatBytes(r.encodedBodySize),
          durationMs: r.durationMs,
        })),
      );
      console.groupEnd();
    };

    const t = setTimeout(finalize, 1500);
    return () => {
      clearTimeout(t);
      try {
        po?.disconnect();
      } catch {
        /* noop */
      }
    };
  }, [candidates]);

  if (!entries.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-[92vw] rounded-lg border border-amber/30 bg-bg-1/95 p-3 text-[11px] shadow-2xl backdrop-blur-md sm:max-w-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="font-semibold text-amber">Hero image diagnostics</span>
        <span className="text-cream/50">{viewport}px</span>
      </div>
      <ul className="space-y-1.5 font-mono">
        {entries.map((e) => (
          <li key={e.name} className="flex items-center justify-between gap-3">
            <span className="truncate text-cream/80" title={e.url}>
              {e.name}
            </span>
            <span className={`shrink-0 ${e.loaded ? "text-amber" : "text-cream/40"}`}>
              {e.loaded ? formatBytes(e.transferSize) : "not fetched"}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.removeItem("heroDebug");
          } catch {
            /* noop */
          }
        }}
        className="mt-2 text-cream/40 hover:text-cream/70"
      >
        hide
      </button>
    </div>
  );
}

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}
