/**
 * Lightweight client-side perf logging.
 *
 * Opt-in only — enable with `?perf=1` in the URL or
 * `localStorage.perfLogs = '1'`. Prints to `console.info` with a
 * `[perf]` prefix so it's easy to filter. No network, no storage,
 * no server dependency.
 *
 * What it logs:
 *   - LCP  (Largest Contentful Paint, from PerformanceObserver)
 *   - TTI  (approximated: first 5s window with no long task > 50ms
 *           after DOMContentLoaded)
 *   - mount(<name>): ms from navigationStart to component mount
 */

let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return (enabled = false);
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("perf") === "1") {
      window.localStorage.setItem("perfLogs", "1");
      return (enabled = true);
    }
    if (url.searchParams.get("perf") === "0") {
      window.localStorage.removeItem("perfLogs");
      return (enabled = false);
    }
    return (enabled = window.localStorage.getItem("perfLogs") === "1");
  } catch {
    return (enabled = false);
  }
}

function log(...args: unknown[]) {
  if (!isEnabled()) return;
  // eslint-disable-next-line no-console
  console.info("[perf]", ...args);
}

function now(): number {
  if (typeof performance === "undefined") return 0;
  return Math.round(performance.now());
}

/** Fire once from the app shell (client-only). */
export function initPerfLogs() {
  if (typeof window === "undefined" || !isEnabled()) return;
  if ((window as unknown as { __perfInit?: boolean }).__perfInit) return;
  (window as unknown as { __perfInit?: boolean }).__perfInit = true;

  log("init @", now(), "ms");

  // LCP — keep updating; final value is the last entry before the page
  // becomes hidden or the user interacts.
  try {
    let lastLcp = 0;
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
      const t = Math.round(last.renderTime || last.loadTime || last.startTime);
      lastLcp = t;
      log("LCP candidate:", t, "ms");
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    const finalize = () => {
      if (lastLcp) log("LCP final:", lastLcp, "ms");
      lcpObs.disconnect();
    };
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finalize();
    }, { once: true });
    addEventListener("pagehide", finalize, { once: true });
  } catch {
    /* PerformanceObserver LCP not supported */
  }

  // TTI approximation — first 5s window with no long task > 50ms
  // after DOMContentLoaded. Good enough to compare before/after.
  try {
    let lastLongTaskEnd = 0;
    let done = false;
    const start = now();
    const ltObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        lastLongTaskEnd = Math.round(e.startTime + e.duration);
      }
    });
    ltObs.observe({ type: "longtask", buffered: true });

    const check = () => {
      if (done) return;
      const t = now();
      // Need at least 5s since the last long task to declare interactive.
      if (t - Math.max(lastLongTaskEnd, start) >= 5000) {
        done = true;
        log("TTI ~=", Math.max(lastLongTaskEnd, start), "ms");
        ltObs.disconnect();
      } else {
        setTimeout(check, 500);
      }
    };
    setTimeout(check, 500);
  } catch {
    /* longtask not supported (Safari) */
  }
}

/** Log a component mount timestamp. Call from a mount effect. */
export function logMount(name: string) {
  if (!isEnabled()) return;
  log(`mount(${name}):`, now(), "ms");
}

/** Log an arbitrary named event. */
export function logEvent(name: string, extra?: Record<string, unknown>) {
  if (!isEnabled()) return;
  if (extra) log(`${name}:`, now(), "ms", extra);
  else log(`${name}:`, now(), "ms");
}
