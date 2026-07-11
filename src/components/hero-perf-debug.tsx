import { useEffect, useState } from "react";
import { useHeroDebugEnabled } from "./hero-image-debug";
import type { PerfPayload } from "@/lib/hero-perf";

type LastBeacon = {
  payload: PerfPayload;
  ok: boolean;
  ts: number;
};

declare global {
  interface Window {
    __heroPerfLast?: LastBeacon;
  }
}

function formatBytes(n: number | null) {
  if (n == null || n === 0) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function HeroPerfDebug() {
  const enabled = useHeroDebugEnabled();
  const [last, setLast] = useState<LastBeacon | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const read = () => {
      setLast(window.__heroPerfLast ?? null);
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-[92vw] rounded-lg border border-amber/30 bg-bg-1/95 p-3 text-[11px] shadow-2xl backdrop-blur-md sm:max-w-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="font-semibold text-amber">Hero perf beacon</span>
        {last ? (
          <span className={last.ok ? "text-amber" : "text-destructive"}>
            {last.ok ? "sent" : "failed"}
          </span>
        ) : (
          <span className="text-cream/50">pending</span>
        )}
      </div>
      {last ? (
        <>
          <pre className="max-h-44 overflow-auto rounded bg-bg-0/60 p-2 font-mono text-[10px] text-cream/80">
            {JSON.stringify(last.payload, null, 2)}
          </pre>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-cream/60">
            <span>transfer</span>
            <span className="text-cream/90">{formatBytes(last.payload.transfer_bytes)}</span>
            <span>encoded</span>
            <span className="text-cream/90">{formatBytes(last.payload.encoded_bytes)}</span>
            <span>viewport</span>
            <span className="text-cream/90">{last.payload.viewport_w}px</span>
            <span>decode</span>
            <span className="text-cream/90">{last.payload.decode_ms ?? "—"} ms</span>
          </div>
          <div className="mt-1.5 text-[10px] text-cream/40">
            {new Date(last.ts).toLocaleTimeString()}
          </div>
        </>
      ) : (
        <div className="text-cream/50">Waiting for LCP + decode...</div>
      )}
    </div>
  );
}
