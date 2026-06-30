import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { useLocale, type Region } from "../lib/i18n";

const WELCOME_FLAG = "welcome_shown";
const REGION_COOKIE = "iran_region";

function hasRegionCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${REGION_COOKIE}=`));
}

function detectSuggested(): Region {
  if (typeof window === "undefined") return "global";
  if (window.location.hostname === "ir.show") return "iran";
  const lang = navigator.language || "";
  if (lang.toLowerCase().startsWith("fa")) return "iran";
  return "global";
}

export function WelcomeRegionModal() {
  const { setRegion } = useLocale();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [suggested, setSuggested] = useState<Region>("global");
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only first-time visitors: no region cookie + not dismissed this session.
    if (hasRegionCookie()) return;
    try {
      if (window.localStorage.getItem(WELCOME_FLAG) === "1") return;
    } catch {}
    setSuggested(detectSuggested());
    setOpen(true);
    // Trigger fade-in next frame.
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      } else if (e.key === "Tab") {
        // Simple focus trap within the card.
        const card = cardRef.current;
        if (!card) return;
        const focusables = card.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Initial focus on the suggested button.
    const t = window.setTimeout(() => {
      const target = cardRef.current?.querySelector<HTMLElement>(
        '[data-suggested="true"]',
      ) ?? cardRef.current?.querySelector<HTMLElement>("button");
      target?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 200);
  }

  function dismiss() {
    try {
      window.localStorage.setItem(WELCOME_FLAG, "1");
    } catch {}
    close();
  }

  function choose(r: Region) {
    setRegion(r);
    try {
      window.localStorage.setItem(WELCOME_FLAG, "1");
    } catch {}
    close();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-region-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        aria-hidden
        onClick={dismiss}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <div
        ref={cardRef}
        className={`relative w-full max-w-[440px] rounded-xl border border-cream/10 bg-bg-0 p-8 shadow-2xl transition-all duration-200 ${
          visible ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <Logo size={48} />
          <h2
            id="welcome-region-title"
            className="mt-6 font-display text-xl font-medium tracking-[-0.01em] text-cream-bright"
          >
            Choose your experience
          </h2>
          <p className="mt-1 font-vazir text-lg text-cream-bright" dir="rtl">
            تجربه خود را انتخاب کنید
          </p>

          <div className="mt-7 flex w-full flex-col gap-3">
            <button
              type="button"
              data-suggested={suggested === "global" ? "true" : undefined}
              onClick={() => choose("global")}
              className={`inline-flex h-12 w-full items-center justify-center rounded-md border bg-transparent px-5 text-sm font-medium text-cream transition-all duration-200 hover:bg-cream/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
                suggested === "global"
                  ? "border-amber/60 hover:border-amber"
                  : "border-cream/20 hover:border-cream/40"
              }`}
            >
              Global — English
            </button>
            <button
              type="button"
              data-suggested={suggested === "iran" ? "true" : undefined}
              onClick={() => choose("iran")}
              dir="rtl"
              className={`inline-flex h-12 w-full items-center justify-center rounded-md border bg-transparent px-5 text-sm font-medium text-cream transition-all duration-200 hover:bg-cream/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
                suggested === "iran"
                  ? "border-amber/60 hover:border-amber"
                  : "border-cream/20 hover:border-cream/40"
              }`}
            >
              <span className="font-vazir">ایران — فارسی</span>
            </button>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-5 text-xs text-cream/40 transition-colors hover:text-cream/70"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
