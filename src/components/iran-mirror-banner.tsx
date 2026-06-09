import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { detectVisitorRegion } from "@/lib/geo.functions";
import { useLocale } from "@/lib/i18n";

const DISMISS_KEY = "ir_mirror_banner_dismissed";

// The hostname the Hetzner reverse proxy serves. Visitors detected as
// being in Iran on the main site are offered a one-click hop here.
// Keep in sync with docs/iran-mirror.md.
const MIRROR_HOST = "m.ir.show";

/**
 * Shown only when:
 *   - visitor's IP geolocates to IR (cf-ipcountry header)
 *   - they are NOT already on the mirror host
 *   - they haven't dismissed the banner before
 */
export function IranMirrorBanner() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [dismissed, setDismissed] = useState(true);

  const { data } = useQuery({
    queryKey: ["visitor-region"],
    queryFn: () => detectVisitorRegion(),
    staleTime: 60 * 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const onMirror = window.location.hostname === MIRROR_HOST;
    setDismissed(alreadyDismissed || onMirror);
  }, []);

  const isIr = data?.region === "iran";
  if (!isIr || dismissed) return null;

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
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-amber/30 bg-bg-1/95 px-4 py-3 shadow-2xl backdrop-blur-md md:bottom-4 md:px-5 md:py-4"
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
            className="rounded-full px-3 py-1.5 text-xs text-cream/70 hover:text-cream"
          >
            {fa ? "بستن" : "Dismiss"}
          </button>
          <button
            onClick={goToMirror}
            className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-bg-0 hover:bg-amber/90"
          >
            {fa ? "رفتن به نسخه ایران" : "Open Iran mirror"}
          </button>
        </div>
      </div>
    </div>
  );
}
