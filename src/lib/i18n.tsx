import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_LANG = "iran_lang";
const STORAGE_REGION = "iran_region";

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_LANG);
  if (stored === "en" || stored === "fa") return stored;
  return "en";
}

function readInitialRegion(): Region {
  if (typeof window === "undefined") return "global";
  const stored = window.localStorage.getItem(STORAGE_REGION);
  if (stored === "global" || stored === "iran") return stored;
  return "global";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [region, setRegionState] = useState<Region>("global");

  // Hydrate from localStorage on the client only
  useEffect(() => {
    setLocaleState(readInitialLocale());
    setRegionState(readInitialRegion());
  }, []);

  // Reflect locale on <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    const persist = (next: Locale) => {
      try {
        window.localStorage.setItem(STORAGE_LANG, next);
      } catch {}
    };

    setLocaleState((prev) => {
      if (prev === l) return prev;
      persist(l);

      if (typeof document !== "undefined") {
        const html = document.documentElement;
        const doc = document as Document & {
          startViewTransition?: (cb: () => void) => unknown;
        };

        // Prefer the View Transitions API: a true cross-fade between LTR/RTL snapshots.
        if (typeof doc.startViewTransition === "function") {
          doc.startViewTransition(() => {
            html.lang = l;
            html.dir = l === "fa" ? "rtl" : "ltr";
            queueMicrotask(() => setLocaleState(l));
          });
          return prev; // state will flip inside the transition
        }

        // Fallback: brief opacity fade to mask the direction flip.
        html.setAttribute("data-locale-switching", "");
        window.setTimeout(() => {
          html.removeAttribute("data-locale-switching");
        }, 420);
      }

      return l;
    });
  }, []);

  const setRegion = useCallback((r: Region) => {
    setRegionState(r);
    try {
      window.localStorage.setItem(STORAGE_REGION, r);
    } catch {}
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const numFmt = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US");
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
    };
  }, [locale, region, setLocale, setRegion]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
