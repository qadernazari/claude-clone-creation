/**
 * Lightweight mount/unmount tracker for hero components.
 *
 * Emits records into `window.__heroMounts` when the URL has `?hero-debug=1`
 * (or `localStorage.heroDebug === "1"`). Consumed by
 * `scripts/perf-hero-check.mjs` to determine whether extra film-covers
 * fetches correlate with double-mount signatures (React StrictMode in dev,
 * key changes, Suspense retries, remounts on re-render, etc.).
 *
 * StrictMode signature (dev only): the same component logs
 *   mount(t=0) → unmount(t=0..few ms) → mount(t=few ms)
 * before any user interaction. Prod builds don't do this, so a match on
 * prod indicates a real remount source, not StrictMode.
 */
import { useEffect, useRef } from "react";

export type HeroMountEvent = {
  component: string;
  key: string | null;
  phase: "mount" | "unmount";
  ts: number; // performance.now()
  seq: number; // monotonic per-page counter
};

declare global {
  interface Window {
    __heroMounts?: HeroMountEvent[];
    __heroMountsSeq?: number;
    __heroMountsEnabled?: boolean;
  }
}

function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__heroMountsEnabled !== undefined) return window.__heroMountsEnabled;
  try {
    const urlEnabled = window.location.search.includes("hero-debug=1");
    const lsEnabled = window.localStorage.getItem("heroDebug") === "1";
    window.__heroMountsEnabled = urlEnabled || lsEnabled;
  } catch {
    window.__heroMountsEnabled = false;
  }
  return !!window.__heroMountsEnabled;
}

function push(evt: Omit<HeroMountEvent, "seq" | "ts">) {
  if (!debugEnabled()) return;
  if (!window.__heroMounts) window.__heroMounts = [];
  window.__heroMountsSeq = (window.__heroMountsSeq ?? 0) + 1;
  window.__heroMounts.push({
    ...evt,
    ts: performance.now(),
    seq: window.__heroMountsSeq,
  });
}

/**
 * Records a mount when the effect runs and an unmount when it cleans up.
 * `key` is optional and helps distinguish sibling instances (e.g. slide id).
 */
export function useHeroMountTracker(component: string, key?: string | null) {
  const keyRef = useRef(key ?? null);
  keyRef.current = key ?? null;
  useEffect(() => {
    push({ component, key: keyRef.current, phase: "mount" });
    return () => {
      push({ component, key: keyRef.current, phase: "unmount" });
    };
    // Intentionally mount-once; `key` changes are covered by React remounting
    // the component (which re-runs this effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component]);
}
