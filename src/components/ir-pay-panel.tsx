import { useState } from "react";
import { createIrCheckout, type IrCheckoutKind } from "@/lib/ir-payments.functions";
import { useLocale } from "@/lib/i18n";

interface IrPayPanelProps {
  kind: IrCheckoutKind;
  itemId: string;
  amountToman?: number;
  couponCode?: string;
  onClose: () => void;
}

/**
 * Iranian gateway checkout panel — replaces the Stripe embedded checkout
 * when the visitor is on the Iran mirror. Calls createIrCheckout, then
 * redirects the user to the gateway's hosted payment page.
 *
 * Until an Iranian gateway is wired (see docs/iran-mirror.md §8), this
 * displays the configuration error returned by the server stub.
 */
export function IrPayPanel({ kind, itemId, amountToman, couponCode, onClose }: IrPayPanelProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedAmount = amountToman
    ? amountToman.toLocaleString(fa ? "fa-IR" : "en-US")
    : null;

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createIrCheckout({
        data: {
          kind,
          itemId,
          ...(amountToman ? { amountToman } : {}),
          ...(couponCode ? { couponCode } : {}),
        },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.href = result.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8" dir={fa ? "rtl" : "ltr"}>
      <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
        {fa ? "پرداخت با کارت ایرانی" : "Pay with Iranian bank card"}
      </h2>
      <p className="mt-2 text-sm text-cream/65">
        {fa
          ? "پرداخت از طریق درگاه ایرانی (شتاب) به تومان."
          : "Secure Toman payment via an Iranian payment gateway."}
      </p>

      {formattedAmount && (
        <div className="mt-5 rounded-xl border border-cream/10 bg-bg-0/40 px-4 py-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-cream/55">
            {fa ? "مبلغ قابل پرداخت" : "Amount due"}
          </div>
          <div className="mt-1 text-2xl text-cream-bright" dir={fa ? "rtl" : "ltr"}>
            {formattedAmount} <span className="text-sm text-cream/65">{fa ? "تومان" : "Toman"}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="mt-6 w-full rounded-md bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90 disabled:opacity-60"
      >
        {loading
          ? fa ? "در حال انتقال…" : "Redirecting…"
          : fa ? "ادامه به درگاه پرداخت" : "Continue to gateway"}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-md px-5 py-2 text-xs text-cream/60 hover:text-cream"
      >
        {fa ? "انصراف" : "Cancel"}
      </button>

      <p className="mt-4 text-center text-[11px] text-cream/40">
        {fa
          ? "پرداخت‌های بین‌المللی (ویزا/مسترکارت) در نسخه ایران فعال نیست."
          : "International cards (Visa / Mastercard) are not available on the Iran mirror."}
      </p>
    </div>
  );
}
