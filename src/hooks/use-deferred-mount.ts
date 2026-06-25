import { useEffect, useState } from "react";

/**
 * Returns true only after the browser is idle (or after a short fallback
 * timeout). Use to keep non-critical UI — auth menu, trial banner,
 * subscription-aware CTAs, secondary chrome — out of the hydration
 * critical path. Avoids the post-paint reflow + Supabase query storm
 * that hurts mobile TBT.
 */
export function useDeferredMount(timeout = 1500): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), Math.min(timeout, 800));
    return () => window.clearTimeout(t);
  }, [timeout]);
  return ready;
}
