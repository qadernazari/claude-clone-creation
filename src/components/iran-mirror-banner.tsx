import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";

const DISMISS_KEY = "ir_mirror_banner_dismissed";
const MIRROR_HOST = "ir.show";

// Hostnames already inside the Iran mirror — banner should not show on these.
const IRAN_HOSTS = new Set(["ir.show", "www.ir.show", "m.ir.show"]);

/**
 * Shown only when:
 *   - the resolved region is Iran (cookie / cf-ipcountry IR)
 *   - they are NOT already on the mirror host
 *   - they haven't dismissed the banner before
 */
export function IranMirrorBanner() {
  const { locale, region } = useLocale();
  const fa = locale === "fa";
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const onMirror = IRAN_HOSTS.has(window.location.hostname);
    setDismissed(alreadyDismissed || onMirror);
  }, []);

  if (region !== "iran" || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };
  const goToMirror = () => {
    const url = new URL(window.location.href);
    url.hostname = MIRROR_HOST;
    window.location.href = url.toString();
  };

  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      role="region"
      aria-label={fa ? "نسخه ایران" : "Iran version"}
      className="iran-mirror-banner fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-amber/30 bg-bg-1/95 px-4 py-3 shadow-2xl backdrop-blur-md md:bottom-4 md:px-5 md:py-4"
    >
      <div className="flex items-start gap-3 md:items-center">
        <div className="flex-1 text-sm leading-relaxed text-cream/90">
          <strong className="font-display text-cream-bright">
            {fa ? "از ایران وصل شده‌اید؟" : "Visiting from Iran?"}
          </strong>{" "}
          {fa
            ? "نسخه بهینه‌شده برای ایران سریع‌تر و بدون فیلترشکن باز می‌شود."
            : "An Iran-optimized mirror loads without a VPN."}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={dismiss}
            className="rounded-md px-3 py-1.5 text-xs text-cream/70 hover:text-cream"
          >
            {fa ? "بستن" : "Dismiss"}
          </button>
          <button
            onClick={goToMirror}
            className="rounded-md bg-amber px-3 py-1.5 text-xs font-semibold text-bg-0 hover:bg-amber/90"
          >
            {fa ? "رفتن به نسخه ایران" : "Open Iran mirror"}
          </button>
        </div>
      </div>
    </div>
  );
}
