import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const FAQ_EN: { q: string; a: string }[] = [
  {
    q: "How does the free trial work?",
    a: "New accounts get 7 days of full access to the entire catalog — no payment required upfront. After 7 days you can choose a membership plan. If you don't subscribe, your access simply ends.",
  },
  {
    q: "What happens after my membership expires?",
    a: "Your access ends on the expiry date. There is no automatic charge. You can renew anytime by purchasing a new plan.",
  },
  {
    q: "Can I cancel my membership?",
    a: "There's nothing to cancel — IRAN memberships are one-time payments with no auto-renewal. You're never locked in.",
  },
  {
    q: "What devices can I watch on?",
    a: "IRAN works on any device with a modern web browser — iPhone, Android, iPad, Mac, PC, and smart TVs with a browser. No app download needed.",
  },
  {
    q: "Are there Persian subtitles?",
    a: "Yes. All films include Persian (Farsi) subtitles. You can toggle them on or off in the video player.",
  },
  {
    q: "Can I watch from Iran?",
    a: "Yes. ir.show is accessible from Iran and worldwide. Some network conditions may affect streaming quality.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, Amex) via Stripe. Payments are secure and encrypted.",
  },
  {
    q: "I have a question not answered here.",
    a: "Email us at hello@ir.show — we typically respond within 24 hours.",
  },
];

const FAQ_FA: { q: string; a: string }[] = [
  {
    q: "دوره‌ی آزمایش رایگان چگونه کار می‌کند؟",
    a: "حساب‌های جدید ۷ روز دسترسی کامل به همه‌ی کاتالوگ دارند — بدون نیاز به پرداخت اولیه. پس از ۷ روز می‌توانید پلن عضویت انتخاب کنید. اگر مشترک نشوید، دسترسی شما به‌سادگی پایان می‌یابد.",
  },
  {
    q: "پس از پایان عضویتم چه می‌شود؟",
    a: "دسترسی شما در تاریخ انقضا پایان می‌یابد. هیچ مبلغی به‌طور خودکار کسر نمی‌شود. هر زمان بخواهید می‌توانید با خرید پلن جدید تمدید کنید.",
  },
  {
    q: "آیا می‌توانم عضویتم را لغو کنم؟",
    a: "چیزی برای لغو وجود ندارد — عضویت‌های ایران پرداخت یک‌باره هستند و تمدید خودکار ندارند. هرگز گرفتار نمی‌شوید.",
  },
  {
    q: "روی چه دستگاه‌هایی می‌توانم تماشا کنم؟",
    a: "ایران روی هر دستگاهی با مرورگر مدرن کار می‌کند — آیفون، اندروید، آیپد، مک، پی‌سی و تلویزیون‌های هوشمند با مرورگر. نیازی به نصب اپلیکیشن نیست.",
  },
  {
    q: "آیا زیرنویس فارسی دارد؟",
    a: "بله. تمام فیلم‌ها شامل زیرنویس فارسی هستند. می‌توانید آن را در پخش‌کننده‌ی ویدیو روشن یا خاموش کنید.",
  },
  {
    q: "آیا از داخل ایران می‌توانم تماشا کنم؟",
    a: "بله. ir.show از داخل ایران و سراسر جهان قابل دسترسی است. شرایط شبکه ممکن است بر کیفیت پخش تأثیر بگذارد.",
  },
  {
    q: "چه روش‌های پرداختی پذیرفته می‌شود؟",
    a: "همه‌ی کارت‌های اعتباری و دبیت اصلی (ویزا، مسترکارت، امکس) از طریق Stripe پذیرفته می‌شود. پرداخت‌ها امن و رمزنگاری شده هستند.",
  },
  {
    q: "سؤالم اینجا پاسخ داده نشده است.",
    a: "به hello@ir.show ایمیل بزنید — معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم.",
  },
];

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — IRAN" },
      {
        name: "description",
        content:
          "Answers to common questions about IRAN: free trial, devices, cancellation, payment methods, subtitles, and watching from Iran.",
      },
      { property: "og:title", content: "Help & FAQ — IRAN" },
      {
        property: "og:description",
        content: "Free trial, devices, cancellation, payments, subtitles, and watching from Iran.",
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
            {fa ? "پرسش‌های پرتکرار." : "Frequently asked questions."}
          </h1>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-6 pb-24">
          <ul className="border-t border-amber/15">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={i} className="border-b border-amber/15">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-start"
                  >
                    <span className="text-[15px] font-medium text-cream-bright">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`shrink-0 text-amber transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pe-8 text-[14px] leading-relaxed text-cream/65">
                        {item.a}
                      </p>
                    </div>
                  </div>
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
