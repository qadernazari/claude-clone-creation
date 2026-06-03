import { useLocale } from "../lib/i18n";
import logoAsset from "../assets/iran-logo.png.asset.json";

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
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <img
        src={logoAsset.url}
        alt={locale === "fa" ? "ایران — سینمای ایران" : "IRAN — Iranian cinema"}
        width={size}
        height={size}
        className="block select-none"
        style={{ height: size, width: "auto" }}
        draggable={false}
      />
      {withTagline ? (
        <span className="text-[10px] uppercase tracking-[0.4em] text-cream/60">
          {locale === "fa" ? "سینمای ایران" : "Iranian cinema"}
        </span>
      ) : null}
    </div>
  );
}
