import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — IRAN" },
      {
        name: "description",
        content:
          "IRAN's refund policy for memberships and Premium tickets. Fair, plain-language rules.",
      },
      { property: "og:title", content: "Refunds — IRAN" },
      { property: "og:description", content: "IRAN's refund policy — plain and fair." },
      { property: "og:url", content: "https://ir.show/refunds" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/refunds" }],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
            {fa ? "حقوقی" : "Legal"}
          </p>
          <h1
            className={`text-4xl leading-[1.05] text-cream-bright md:text-6xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "بازگشت وجه." : "Refunds."}
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-cream/70">
            {fa
              ? "قوانین ساده و منصفانه برای بازگشت وجه عضویت و بلیت‌های ویژه."
              : "Plain, fair rules for refunding memberships and Premium tickets."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className={`space-y-10 text-[15px] leading-relaxed text-cream/80 ${fa ? "font-vazir" : ""}`}>
          {(fa ? SECTIONS_FA : SECTIONS_EN).map((s, i) => (
            <div key={i}>
              <h2
                className={`mb-3 text-xl text-cream-bright md:text-2xl ${fa ? "font-vazir" : "font-display"}`}
              >
                {s.title}
              </h2>
              <div className="space-y-3">{s.body}</div>
            </div>
          ))}

          <div className="mt-12 rounded-xl border border-amber/20 bg-amber/5 p-6">
            <p className="text-sm text-cream/85">
              {fa ? (
                <>
                  برای درخواست بازگشت وجه به{" "}
                  <a href="mailto:info@ir.show" className="text-amber hover:underline">
                    info@ir.show
                  </a>{" "}
                  ایمیل بزنید. لطفاً شناسه‌ی سفارش یا ایمیل حساب را بنویسید. معمولاً ظرف ۲۴ ساعت
                  پاسخ می‌دهیم.
                </>
              ) : (
                <>
                  To request a refund, email{" "}
                  <a href="mailto:info@ir.show" className="text-amber hover:underline">
                    info@ir.show
                  </a>{" "}
                  with your order ID or account email. We typically respond within 24 hours.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const SECTIONS_EN: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Free trial",
    body: (
      <p>
        The 90-day free trial is exactly that — free. You are not charged during the trial. Cancel
        anytime from Account → Manage subscription and nothing is billed.
      </p>
    ),
  },
  {
    title: "2. Membership",
    body: (
      <>
        <p>
          Memberships are one-time purchases with no auto-renewal. If you haven't started watching
          any film after purchase, contact us within 14 days for a full refund.
        </p>
        <p>
          Once you have started streaming content on your membership, refunds are handled
          case-by-case — write to us and we'll do our best to be fair.
        </p>
      </>
    ),
  },
  {
    title: "3. Premium tickets",
    body: (
      <>
        <p>
          Premium tickets grant permanent access to a single film — once purchased, the film is
          yours to stream anytime, forever.
        </p>
        <p>
          Tickets are refundable before playback begins. Once you press play, tickets are
          non-refundable, except when a technical fault on our side prevented you from watching. In
          that case, we will refund the ticket or grant you a replacement.
        </p>
      </>
    ),
  },
  {
    title: "4. Payment errors",
    body: (
      <p>
        If you were charged incorrectly — duplicate charges, wrong amount, or a charge you don't
        recognize — email us within 7 days and we will investigate and refund any error on our
        side.
      </p>
    ),
  },
  {
    title: "5. How refunds are issued",
    body: (
      <p>
        Approved refunds are returned to the original payment method. Card refunds usually appear
        within 5–10 business days depending on your bank. ZarinPal refunds follow ZarinPal's
        standard timeline (typically 24–72 hours).
      </p>
    ),
  },
];

const SECTIONS_FA: { title: string; body: React.ReactNode }[] = [
  {
    title: "۱. آزمایش رایگان",
    body: (
      <p>
        دوره‌ی ۹۰ روزه‌ی آزمایش کاملاً رایگان است. در این مدت مبلغی از شما کسر نمی‌شود. هر زمان از
        بخش «حساب ← مدیریت اشتراک» لغو کنید، هیچ هزینه‌ای دریافت نخواهد شد.
      </p>
    ),
  },
  {
    title: "۲. عضویت",
    body: (
      <>
        <p>
          عضویت‌ها خرید یک‌باره‌اند و به‌طور خودکار تمدید نمی‌شوند. اگر پس از خرید هنوز هیچ فیلمی
          را شروع به تماشا نکرده‌اید، تا ۱۴ روز فرصت دارید برای بازگشت کامل وجه با ما تماس بگیرید.
        </p>
        <p>
          پس از شروع تماشای محتوا با عضویت‌تان، بازگشت وجه به‌صورت موردی بررسی می‌شود — با ما در
          میان بگذارید، تلاش می‌کنیم منصفانه رفتار کنیم.
        </p>
      </>
    ),
  },
  {
    title: "۳. بلیت‌های ویژه",
    body: (
      <>
        <p>
          بلیت ویژه دسترسی دائمی به یک فیلم می‌دهد — پس از خرید، فیلم برای همیشه در دسترس شماست و
          هر زمان می‌توانید تماشا کنید.
        </p>
        <p>
          پیش از شروع پخش، بلیت قابل بازگشت است. پس از شروع پخش، بلیت قابل بازگشت نیست، مگر اینکه
          نقصِ فنی از سمت ما مانع تماشا شده باشد؛ در این صورت وجه بلیت را بازمی‌گردانیم یا بلیت
          جایگزین ارائه می‌دهیم.
        </p>
      </>
    ),
  },
  {
    title: "۴. خطای پرداخت",
    body: (
      <p>
        اگر مبلغ اشتباه از شما کسر شد — کسر تکراری، مبلغ نادرست یا تراکنشی که آن را نمی‌شناسید —
        ظرف ۷ روز به ما ایمیل بزنید تا بررسی و در صورت خطا از سمت ما وجه بازگردانده شود.
      </p>
    ),
  },
  {
    title: "۵. شیوه‌ی بازگشت وجه",
    body: (
      <p>
        وجه‌های تأییدشده به همان روش پرداخت اولیه بازگردانده می‌شوند. بازگشت به کارت بانکی معمولاً
        ۵ تا ۱۰ روز کاری بسته به بانک شما زمان می‌برد. بازگشت‌های زرین‌پال طبق زمان‌بندی استاندارد
        زرین‌پال (معمولاً ۲۴ تا ۷۲ ساعت) انجام می‌شود.
      </p>
    ),
  },
];
