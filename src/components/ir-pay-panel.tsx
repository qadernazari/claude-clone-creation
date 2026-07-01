import { Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/use-subscription";
import { buildZarinpalPaymentUrl } from "@/lib/ir-payments-browser";

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

interface IrPayPanelProps {
  kind: IrCheckoutKind;
  itemId: string;
  amountToman?: number;
  couponCode?: string;
  onClose: () => void;
}

export function IrPayPanel({ kind, itemId, amountToman, onClose }: IrPayPanelProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const user = useCurrentUser();


  return (
    <div className="p-6 sm:p-8" dir={fa ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close checkout"
        className="absolute top-3 z-10 grid h-9 w-9 place-items-center rounded-md bg-bg-0/80 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15 ltr:right-3 rtl:left-3"
      >
        ✕
      </button>

      <div className="flex flex-col items-center text-center pt-4 pb-2">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-amber/10 ring-1 ring-amber/25">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-amber"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
          </svg>
        </div>

        <span className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber/90">
          {fa ? "درگاه ایرانی — زرین‌پال" : "ZarinPal"}
        </span>
        <div
          className="mt-2 h-[2px] w-16 rounded-full"
          style={{ background: "linear-gradient(90deg, #2DA84F, #f5f0e8, #DA0000)" }}
          aria-hidden="true"
        />
        <h2 className={`mt-2 text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? "پرداخت با کارت ایرانی" : "Pay with Iranian card"}
        </h2>

        {typeof amountToman === "number" && amountToman >= 1000 && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/75">
            {fa
              ? `مبلغ قابل پرداخت: ${amountToman.toLocaleString("fa-IR")} تومان`
              : `Amount: ${amountToman.toLocaleString("en-US")} Toman`}
          </p>
        )}

        {user && amountToman && amountToman >= 1000 ? (
          <a
            href={buildZarinpalPaymentUrl({ amountToman, kind, itemId, userId: user.id })}
            target="_self"
            rel="noreferrer"
            className="mt-5 w-full block rounded-md bg-amber px-5 py-3 text-sm font-semibold text-bg-0 hover:bg-amber/90 transition-colors text-center"
          >
            {fa ? "پرداخت با زرین‌پال" : "Pay with ZarinPal"}
          </a>
        ) : !user ? (
          <a
            href="/auth"
            className="mt-5 w-full block rounded-md bg-amber px-5 py-3 text-sm font-semibold text-bg-0 hover:bg-amber/90 transition-colors text-center"
          >
            {fa ? "ورود برای پرداخت" : "Sign in to pay"}
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="mt-5 w-full rounded-md bg-amber/50 px-5 py-3 text-sm font-semibold text-bg-0 cursor-not-allowed"
          >
            {fa ? "پرداخت با زرین‌پال" : "Pay with ZarinPal"}
          </button>
        )}

        <Link
          to="/account"
          onClick={onClose}
          className="mt-3 text-xs text-cream/60 hover:text-cream transition-colors"
        >
          {fa ? "یا شروع دوره آزمایشی ۳۰ روزه رایگان" : "Or start 30-day free trial"}
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-md px-5 py-2 text-xs text-cream/60 hover:text-cream transition-colors"
        >
          {fa ? "بستن" : "Close"}
        </button>
      </div>
    </div>
  );
}
