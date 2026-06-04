import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateCoupon } from "@/lib/coupons.functions";

interface CouponFieldProps {
  context: "membership" | "ticket";
  filmId?: string;
  fa?: boolean;
  applied: { code: string; label: string } | null;
  onApply: (info: { code: string; label: string } | null) => void;
}

export function CouponField({ context, filmId, fa, applied, onApply }: CouponFieldProps) {
  const check = useServerFn(validateCoupon);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const labels = {
    placeholder: fa ? "کد تخفیف" : "Promo code",
    apply: fa ? "اعمال" : "Apply",
    applied: fa ? "اعمال شد" : "Applied",
    remove: fa ? "حذف" : "Remove",
  };

  async function handleApply() {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await check({ data: { code: trimmed, context, filmId } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onApply({ code: res.code, label: res.discountLabel });
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not validate code");
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
        <span className="text-emerald-300">
          <span className="font-mono">{applied.code}</span>
          {" · "}
          <span className="text-emerald-200/80">{applied.label}</span>
        </span>
        <button
          type="button"
          onClick={() => onApply(null)}
          className="text-xs text-emerald-200/70 hover:text-emerald-100 underline"
        >
          {labels.remove}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleApply();
            }
          }}
          placeholder={labels.placeholder}
          className="flex-1 rounded-md border border-cream/20 bg-bg-0/60 px-3 py-2 text-sm font-mono uppercase placeholder:font-sans placeholder:normal-case placeholder:text-cream/40 text-cream focus:border-amber/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="rounded-md border border-cream/25 px-4 py-2 text-sm text-cream hover:bg-cream/5 disabled:opacity-50"
        >
          {loading ? "…" : labels.apply}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
