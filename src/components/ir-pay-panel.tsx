import { Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import type { IrCheckoutKind } from "@/lib/ir-payments.functions";

interface IrPayPanelProps {
  kind: IrCheckoutKind;
  itemId: string;
  amountToman?: number;
  couponCode?: string;
  onClose: () => void;
}

/**
 * Iranian gateway checkout panel — replaces the Stripe embedded checkout
 * when the visitor is on the Iran mirror.
 *
 * Until an Iranian gateway (ZarinPal) is wired up, this shows a friendly
 * coming-soon message with a contact link instead of a broken payment stub.
 */
export function IrPayPanel({ onClose, kind, itemId, amountToman, couponCode }: IrPayPanelProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";

  void kind;
  void itemId;
  void amountToman;
  void couponCode;

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

        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber/90">
          {fa ? "درگاه ایرانی" : "ZarinPal"}
        </span>
        <div
          className="mt-2 h-[2px] w-16 rounded-full"
          style={{ background: "linear-gradient(90deg, #2DA84F, #f5f0e8, #DA0000)" }}
          aria-hidden="true"
        />
        <h2 className={`mt-2 text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? "تقریباً آماده است" : "Almost ready"}
        </h2>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/75">
          {fa
            ? "درگاه پرداخت ایرانی (زرین‌پال) به‌زودی فعال می‌شود. تا آن زمان می‌توانید از دوره آزمایشی ۳۰ روزه رایگان استفاده کنید."
            : "Our Iranian payment gateway (ZarinPal) is launching soon. In the meantime, start your free 30-day trial — no payment needed."}
        </p>
        <Link
          to="/account"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-amber px-5 py-3 text-sm font-semibold text-bg-0 hover:bg-amber/90 transition-colors text-center"
        >
          {fa ? "شروع آزمایش رایگان" : "Start free trial instead"}
        </Link>

        <a
          href="mailto:hello@ir.show"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
          hello@ir.show
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-md px-5 py-2 text-xs text-cream/60 hover:text-cream transition-colors"
        >
          {fa ? "بستن" : "Close"}
        </button>
      </div>
    </div>
  );
}
