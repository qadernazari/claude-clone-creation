import { useEffect, useState } from "react";
import { useLocale, type Region } from "../lib/i18n";
import { Logo } from "./logo";

const STORAGE_SEEN = "iran_splash_seen";

/**
 * Welcome splash — shown once on first visit. The visitor picks a region,
 * which sets the initial locale (global → en, iran → fa) and the saved
 * payment region. Subsequent visits skip the splash; the language toggle
 * in the header can still flip locales independently.
 */
export function WelcomeSplash() {
  const { setRegion } = useLocale();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_SEEN);
    if (!seen) {
      setVisible(true);
      // next frame for enter transition
      requestAnimationFrame(() => setMounted(true));
    }
  }, []);

  // Lock background scroll/interaction while splash is visible
  useEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  const choose = (region: Region) => {
    setRegion(region);
    try {
      window.localStorage.setItem(STORAGE_SEEN, "1");
    } catch {}
    setClosing(true);
    window.setTimeout(() => setVisible(false), 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select region"
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg-0 px-5 py-8 transition-opacity duration-500 ease-out sm:px-6 ${
        mounted && !closing ? "opacity-100" : "opacity-0"
      }`}
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Subtle cinematic vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div
        className={`relative w-full max-w-xl text-center transition-all duration-700 ease-out ${
          mounted && !closing ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="flex justify-center">
          <Logo size={72} />
        </div>

        <div className="mt-10 space-y-3 sm:mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-amber/80">
            Welcome
          </p>
          <h2 className="font-display text-2xl font-light tracking-tight text-cream-bright sm:text-[28px]">
            Choose your region
          </h2>
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-cream/55">
            Select where you're watching from so we can show the right language, pricing, and payment options.
          </p>
          <p className="font-fa text-xs tracking-[0.05em] text-cream/40" lang="fa" dir="rtl">
            منطقه‌ی خود را انتخاب کنید
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            onClick={() => choose("iran")}
            className="group relative flex flex-col items-center gap-2 rounded-none border border-cream/10 bg-transparent px-6 py-8 text-center transition-all duration-500 hover:border-amber/50 hover:bg-cream/[2%] sm:py-10"
          >
            <span className="font-display text-xl font-light tracking-wide text-cream-bright transition-colors group-hover:text-amber">
              Inside Iran
            </span>
            <span className="font-fa text-[15px] tracking-wide text-cream/70 transition-colors group-hover:text-cream" dir="rtl" lang="fa">
              داخل ایران
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/40 transition-colors group-hover:text-cream/70">
              Persian · Toman · Local pay
            </span>
            <span className="mt-3 block h-px w-6 bg-cream/15 transition-all duration-500 group-hover:w-12 group-hover:bg-amber/60" />
          </button>

          <button
            type="button"
            onClick={() => choose("global")}
            className="group relative flex flex-col items-center gap-2 rounded-none border border-cream/10 bg-transparent px-6 py-8 text-center transition-all duration-500 hover:border-amber/50 hover:bg-cream/[2%] sm:py-10"
          >
            <span className="font-display text-xl font-light tracking-wide text-cream-bright transition-colors group-hover:text-amber">
              Outside Iran
            </span>
            <span className="text-[13px] tracking-wide text-cream/70 transition-colors group-hover:text-cream">
              International
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/40 transition-colors group-hover:text-cream/70">
              English · USD · Card
            </span>
            <span className="mt-3 block h-px w-6 bg-cream/15 transition-all duration-500 group-hover:w-12 group-hover:bg-amber/60" />
          </button>
        </div>

        <p className="mt-10 text-[10px] font-medium uppercase tracking-[0.3em] text-cream/30 sm:mt-12">
          You can change this anytime in Account
        </p>
      </div>
    </div>
  );
}
