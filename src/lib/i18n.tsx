import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setRegionPreference } from "@/lib/region.functions";

export type Locale = "en" | "fa";
export type Region = "global" | "iran";

type LocaleContextValue = {
  locale: Locale;
  region: Region;
  setLocale: (l: Locale) => void;
  setRegion: (r: Region) => void;
  /** Pick the EN or FA field from a `{ en, fa }` shaped object. */
  t: <T>(obj: { en: T; fa: T } | undefined | null, fallback?: T) => T | undefined;
  dir: "ltr" | "rtl";
  /** Format a number with locale-appropriate digits (Persian uses ۰-۹). */
  num: (n: number) => string;
  /** Format a year (no thousands separators) with locale-appropriate digits. */
  year: (n: number) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_REGION = "iran_region";

declare global {
  interface Window {
    __IRAN_REGION__?: { region: Region; locale: Locale };
  }
}

/**
 * Read the initial region for the client. Priority:
 *   1. Explicit manual cookie (`iran_region=manual:<region>`) — user choice wins.
 *   2. Bare `ir.show` hostname — always treated as the Iranian mirror.
 *   3. SSR-injected region from `window.__IRAN_REGION__` (geo/cookie based).
 *   4. localStorage fallback for local dev / missing SSR.
 *   5. Persian / Iranian default.
 */
function readInitialRegion(): Region {
  if (typeof window === "undefined") return "iran";

  // Respect explicit manual region choice cookie first, regardless of host.
  const manualCookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("iran_region="))
    ?.split("=")[1]
    ?.trim();
  if (manualCookie === "manual:iran") return "iran";
  if (manualCookie === "manual:global") return "global";

  // Bare ir.show (without www) is the Iranian mirror — default to Persian.
  if (window.location.hostname === "ir.show") return "iran";

  const injected = window.__IRAN_REGION__?.region;
  if (injected === "iran" || injected === "global") return injected;
  // Local dev / no SSR — fall back to localStorage
  const stored = window.localStorage.getItem(STORAGE_REGION);
  if (stored === "iran" || stored === "global") return stored;
  // Default to Persian for all visitors
  return "iran";
}


function regionToLocale(r: Region): Locale {
  return r === "iran" ? "fa" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from SSR-injected value — same on server and
  // first client render → no hydration mismatch, no flash.
  const initialRegion: Region =
    typeof window === "undefined" ? "global" : readInitialRegion();
  const [region, setRegionState] = useState<Region>(initialRegion);
  const [locale, setLocaleState] = useState<Locale>(regionToLocale(initialRegion));

  // Mirror to <html> on changes (initial SSR HTML already has correct attrs).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === "fa" ? "rtl" : "ltr";
    html.dataset.region = region;
  }, [locale, region]);

  const persistRegion = useCallback((r: Region) => {
    try {
      window.localStorage.setItem(STORAGE_REGION, r);
    } catch {}
    // Fire-and-forget cookie write so future SSR responses match.
    setRegionPreference({ data: { region: r } }).catch(() => {});
  }, []);

  const setRegion = useCallback(
    (r: Region) => {
      const pairedLocale = regionToLocale(r);
      setRegionState(r);
      setLocaleState(pairedLocale);
      persistRegion(r);
      if (typeof document !== "undefined") {
        const html = document.documentElement;
        html.lang = pairedLocale;
        html.dir = pairedLocale === "fa" ? "rtl" : "ltr";
        html.dataset.region = r;
      }
    },
    [persistRegion],
  );

  const setLocale = useCallback(
    (l: Locale) => {
      // Locale and region are linked: changing one updates both.
      setRegion(l === "fa" ? "iran" : "global");
    },
    [setRegion],
  );

  const value = useMemo<LocaleContextValue>(() => {
    const numFmt = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US");
    const yearFmt = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
      useGrouping: false,
    });
    return {
      locale,
      region,
      setLocale,
      setRegion,
      dir: locale === "fa" ? "rtl" : "ltr",
      t: (obj, fallback) => {
        if (!obj) return fallback;
        const v = obj[locale];
        if (v === undefined || v === null || v === "") return obj.en ?? fallback;
        return v;
      },
      num: (n) => numFmt.format(n),
      year: (n) => yearFmt.format(n),
    };
  }, [locale, region, setLocale, setRegion]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
