import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — IRAN" },
      {
        name: "description",
        content:
          "Answers to common questions about IRAN: free trial, devices, cancellation, payment methods, and watching from Iran.",
      },
      { property: "og:title", content: "Help & FAQ — IRAN" },
      {
        property: "og:description",
        content: "Free trial, devices, cancellation, payments, and watching from Iran.",
      },
      { property: "og:url", content: "https://ir.show/help" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/help" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_EN.map((q) => ({
            "@type": "Question",
            name: q.q,
            acceptedAnswer: { "@type": "Answer", text: q.a },
          })),
        }),
      },
    ],
  }),
  component: HelpPage,
});

const FAQ_EN: { q: string; a: string }[] = [
  {
    q: "How does the free trial work?",
    a: "New members get 7 days of full access to the entire IRAN catalog at no cost and with no payment details required. At the end of the trial you can choose a membership plan if you'd like to keep watching — nothing is charged automatically.",
  },
  {
    q: "What devices can I watch on?",
    a: "IRAN streams in any modern browser on phone, tablet, laptop, and desktop. We support iOS Safari, Android Chrome, plus desktop Chrome, Safari, Firefox, and Edge. There's nothing to install.",
  },
  {
    q: "How do I cancel?",
    a: "There is nothing to cancel. Every membership is a one-time payment for the period you chose (1, 3, 6, or 12 months). When it ends, access stops unless you renew.",
  },
  {
    q: "Is there auto-renewal?",
    a: "No. We don't auto-renew. You always decide when to extend your membership.",
  },
  {
    q: "What payment methods do you accept?",
    a: "International credit and debit cards via Stripe (Visa, Mastercard, American Express), plus Iranian Rial payments via local gateways for members inside Iran.",
  },
  {
    q: "Can I watch in Iran?",
    a: "Yes. IRAN is fully accessible from inside Iran. Local Rial payment is supported and the service runs without a VPN.",
  },
];

const FAQ_FA: { q: string; a: string }[] = [
  {
    q: "دوره‌ی آزمایش رایگان چگونه کار می‌کند؟",
    a: "اعضای جدید ۷ روز به‌صورت کامل و رایگان به همه‌ی کاتالوگ ایران دسترسی دارند، بدون نیاز به اطلاعات پرداخت. در پایان دوره می‌توانید پلن دلخواه‌تان را انتخاب کنید — هیچ مبلغی به‌طور خودکار کسر نمی‌شود.",
  },
  {
    q: "روی چه دستگاه‌هایی می‌توانم تماشا کنم؟",
    a: "ایران در هر مرورگر مدرنی پخش می‌شود: موبایل، تبلت، لپ‌تاپ و دسکتاپ. سافاری iOS، کروم اندروید و همچنین کروم، سافاری، فایرفاکس و اج روی دسکتاپ پشتیبانی می‌شود. نیازی به نصب اپلیکیشن نیست.",
  },
  {
    q: "چگونه عضویتم را لغو کنم؟",
    a: "چیزی برای لغو وجود ندارد. هر عضویت یک پرداخت یک‌باره برای دوره‌ی انتخابی شماست (۱، ۳، ۶ یا ۱۲ ماه). پس از پایان دوره، دسترسی متوقف می‌شود مگر آن‌که خودتان تمدید کنید.",
  },
  {
    q: "آیا تمدید خودکار وجود دارد؟",
    a: "خیر. ما تمدید خودکار نداریم. زمان تمدید همیشه با خودِ شماست.",
  },
  {
    q: "چه روش‌های پرداختی پذیرفته می‌شود؟",
    a: "کارت‌های اعتباری و دبیت بین‌المللی از طریق Stripe (ویزا، مسترکارت، امریکن اکسپرس) و همچنین پرداخت ریالی از طریق درگاه‌های داخلی برای اعضای داخل ایران.",
  },
  {
    q: "آیا می‌توانم از داخل ایران تماشا کنم؟",
    a: "بله. ایران به‌طور کامل از داخل کشور قابل دسترسی است. پرداخت ریالی پشتیبانی می‌شود و سرویس بدون نیاز به VPN کار می‌کند.",
  },
];

function HelpPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  const items = fa ? FAQ_FA : FAQ_EN;
  const [open, setOpen] = useState<number | null>(0);

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
            {fa ? "راهنما" : "Help"}
          </p>
          <h1
            className={`text-4xl leading-[1.05] text-cream-bright md:text-6xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "پرسش‌های پرتکرار" : "Frequently asked questions"}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/70">
            {fa
              ? "پاسخ سؤال خود را اینجا پیدا نکردید؟ به hello@ir.show ایمیل بزنید — معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم."
              : "Can't find what you're looking for? Email hello@ir.show — we usually reply within 24 hours."}
          </p>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <ul className="divide-y divide-line">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-6 text-start"
                  >
                    <span
                      className={`text-lg text-cream-bright md:text-xl ${fa ? "font-vazir" : "font-display"}`}
                    >
                      {item.q}
                    </span>
                    <span
                      className={`shrink-0 text-amber transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <p className="pb-6 pe-10 text-[15px] leading-relaxed text-cream/70">
                      {item.a}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
