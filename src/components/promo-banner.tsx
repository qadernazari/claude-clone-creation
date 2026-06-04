import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPromoBanners, type PromoBanner } from "@/lib/promo.functions";

interface PromoBannerListProps {
  context: "membership" | "ticket";
  filmId?: string;
  fa?: boolean;
  onApply?: (code: string) => void;
}

export function PromoBannerList({ context, filmId, fa, onApply }: PromoBannerListProps) {
  const fetchBanners = useServerFn(listPromoBanners);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBanners({ data: { context, filmId } })
      .then((res) => {
        if (!cancelled) setBanners(res.banners);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [context, filmId, fetchBanners]);

  if (banners.length === 0) return null;

  async function handleClick(code: string) {
    if (onApply) {
      onApply(code);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-2" dir={fa ? "rtl" : "ltr"}>
      {banners.map((b) => (
        <button
          key={b.code}
          type="button"
          onClick={() => handleClick(b.code)}
          className="group flex w-full items-center gap-3 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-start text-sm text-cream hover:bg-amber/15 transition-colors"
        >
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-amber/30 px-2 text-[11px] font-medium text-amber">
            {b.discountLabel}
          </span>
          <span className="flex-1 truncate text-cream/90">{b.description}</span>
          <span className="font-mono text-xs uppercase text-amber/90 group-hover:text-amber">
            {copiedCode === b.code
              ? fa
                ? "کپی شد"
                : "Copied!"
              : b.code}
          </span>
        </button>
      ))}
    </div>
  );
}
