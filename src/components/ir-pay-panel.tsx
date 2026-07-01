import { Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

interface IrPayPanelProps {
  kind: IrCheckoutKind;
  itemId: string;
  amountToman?: number;
  couponCode?: string;
  onClose: () => void;
}

export function IrPayPanel({ onClose, amountToman }: IrPayPanelProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";

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

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/75">
          {fa
            ? "درگاه پرداخت در حال راه‌اندازی است. برای عضویت با ما در تماس باشید."
            : "Payment gateway is being set up. Contact us to subscribe."}
        </p>

        <a
          href="https://t.me/irshow_support"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 w-full rounded-md bg-amber px-5 py-3 text-sm font-semibold text-bg-0 hover:bg-amber/90 transition-colors inline-flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          {fa ? "تماس با پشتیبانی" : "Contact Support"}
        </a>

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
