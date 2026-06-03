import { useEffect, useState } from "react";
import { useLocale, type Locale, type Region } from "../lib/i18n";
import { Logo } from "./logo";

const STORAGE_SEEN = "iran_splash_seen";

/**
 * Welcome splash — shown once on first visit. The visitor picks a region,
 * which sets the initial locale (global → en, iran → fa) and the saved
 * payment region. Subsequent visits skip the splash; the language toggle
 * in the header can still flip locales independently.
 */
export function WelcomeSplash() {
  const { setLocale, setRegion } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_SEEN);
    if (!seen) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (locale: Locale, region: Region) => {
    setLocale(locale);
    setRegion(region);
    try {
      window.localStorage.setItem(STORAGE_SEEN, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select region"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0 px-6"
    >
      <div className="w-full max-w-xl text-center">
        <Logo size={120} />
        <div className="mt-10 space-y-1">
          <h2 className="font-display text-3xl text-cream-bright">Select Region</h2>
          <p className="text-base text-cream/70" lang="fa" dir="rtl">
            انتخاب منطقه
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("en", "global")}
            className="hairline group flex flex-col items-center gap-2 rounded-2xl border bg-bg-1 px-6 py-7 text-left transition-colors hover:border-amber/40 hover:bg-bg-1/80"
          >
            <span className="text-3xl">🌍</span>
            <span className="font-display text-xl text-cream-bright">Global</span>
            <span className="text-xs text-cream/55">English · USD · Card / PayPal</span>
          </button>
          <button
            type="button"
            onClick={() => choose("fa", "iran")}
            className="hairline group flex flex-col items-center gap-2 rounded-2xl border bg-bg-1 px-6 py-7 text-left transition-colors hover:border-amber/40 hover:bg-bg-1/80"
            dir="rtl"
            lang="fa"
          >
            <span className="text-3xl">🇮🇷</span>
            <span className="font-display text-xl text-cream-bright">تماشا در ایران</span>
            <span className="text-xs text-cream/55">فارسی · تومان · زرین‌پال</span>
          </button>
        </div>
        <p className="mt-8 text-xs text-cream/45">
          You can change language any time from the header.
        </p>
      </div>
    </div>
  );
}
