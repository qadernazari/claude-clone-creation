import { useLocale } from "../lib/i18n";
import logoAsset from "../assets/iran-logo.webp.asset.json";

type Props = {
  className?: string;
  /** Pixel height of the logo */
  size?: number;
  withTagline?: boolean;
};

/**
 * IRAN bilingual 3D wordmark. The mark itself is bilingual (English + Persian),
 * so we don't swap the image based on locale — only the optional tagline below.
 */
export function Logo({ className = "", size = 40, withTagline = false }: Props) {
  const { locale } = useLocale();
  // Intrinsic size hint = 2x the display size so the browser knows it can
  // safely downscale (and pick a high-DPI rendering on retina screens)
  // without preallocating space for the 200x200 source bitmap. Keeps the
  // file ~12 KiB but stops PageSpeed from flagging it as oversized.
  const intrinsic = size * 2;
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <img
        src={logoAsset.url}
        alt={locale === "fa" ? "ایران — سینمای ایران" : "IRAN — Iranian cinema"}
        width={intrinsic}
        height={intrinsic}
        className="block select-none"
        style={{ height: size, width: "auto" }}
        draggable={false}
        loading="eager"
        decoding="async"
        fetchPriority="low"
      />
      {withTagline ? (
        <span className="text-[10px] uppercase tracking-[0.4em] text-cream/60">
          {locale === "fa" ? "سینمای ایران" : "Iranian cinema"}
        </span>
      ) : null}
    </div>
  );
}
