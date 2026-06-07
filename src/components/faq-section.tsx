import { useLocale } from "@/lib/i18n";

type QA = { q: string; a: string };

const EN: QA[] = [
  {
    q: "What is IRAN Membership?",
    a: "A monthly subscription that unlocks our full catalog — originals, documentaries, and curated collections. New titles added regularly. Start with a 7-day free trial.",
  },
  {
    q: "How much does it cost? Is there a free trial?",
    a: "Pricing is shown at checkout in your local currency. New members get a 7-day free trial — no charge during the trial, cancel anytime.",
  },
  {
    q: "What's included in membership vs. Premium tickets?",
    a: "Most films stream unlimited with membership. Premium films are sold separately as a 48-hour rental, even for members. Each film page shows which it is.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from Account → Manage subscription. Your access continues until the end of the current billing period.",
  },
  {
    q: "Which devices are supported?",
    a: "Any modern browser on phone, tablet, laptop, or smart TV. AirPlay and Chromecast work where the browser allows it.",
  },
  {
    q: "Are subtitles available?",
    a: "Yes. Every Persian-language film ships with high-quality English subtitles. Persian subtitles are added where available.",
  },
  {
    q: "How do filmmakers get paid?",
    a: "Directly, with transparent revenue sharing on every ticket and membership stream. Tips left through Support the filmmaker go straight to the artist.",
  },
];

const FA: QA[] = [
  {
    q: "عضویت IRAN چیست؟",
    a: "عضویت IRAN اشتراک ماهانه‌ای است که دسترسی نامحدود به مجموعه‌ی عضویت — آثار اوریجینال، مستندها و مجموعه‌های منتخب از سینماگران ایرانی — را در اختیار شما می‌گذارد. آثار تازه به‌طور منظم اضافه می‌شود.",
  },
  {
    q: "هزینه عضویت چقدر است؟",
    a: "قیمت عضویت هنگام پرداخت به ارز محلی شما نمایش داده می‌شود. هر زمان می‌توانید از حساب کاربری لغو کنید و دسترسی شما تا پایان دوره‌ی پرداخت‌شده باقی می‌ماند.",
  },
  {
    q: "آیا دوره آزمایشی رایگان وجود دارد؟",
    a: "بله. اعضای جدید از ۷ روز آزمایش رایگان بهره‌مند می‌شوند. در طول این دوره هیچ مبلغی برداشت نمی‌شود و می‌توانید پیش از پایان آن بدون پرداخت لغو کنید.",
  },
  {
    q: "آیا بدون عضویت می‌توان فیلم تماشا کرد؟",
    a: "بله. آثار منتخبی به‌صورت اجاره‌ی تک‌فیلم (پرداخت به‌ازای تماشا) عرضه می‌شود و بعضی آثار رایگان هستند. آثار ویژه ممکن است حتی برای اعضا جداگانه عرضه شوند. صفحه‌ی هر فیلم دقیقاً نحوه‌ی دسترسی را نشان می‌دهد.",
  },
  {
    q: "چه فیلم‌هایی در عضویت قرار دارند؟",
    a: "هر فیلمی که با عنوان «شامل عضویت» مشخص شده، برای اعضای فعال به‌صورت نامحدود قابل تماشاست. آثار «ویژه» جداگانه به‌صورت تک‌فیلم به فروش می‌رسند. وضعیت دسترسی همیشه در صفحه‌ی فیلم درج شده است.",
  },
  {
    q: "آیا روی موبایل، تبلت و تلویزیون قابل تماشا است؟",
    a: "بله. IRAN روی هر مرورگر مدرن — موبایل، تبلت، لپ‌تاپ و تلویزیون هوشمند — پخش می‌شود. AirPlay و Chromecast نیز روی دستگاه‌هایی که از این قابلیت‌ها پشتیبانی می‌کنند فعال است.",
  },
  {
    q: "چگونه می‌توانم از فیلم‌سازان حمایت کنم؟",
    a: "در صفحه‌ی هر فیلم گزینه‌ی «حمایت از فیلم‌ساز» وجود دارد. کمک شما مستقیماً به ادامه‌ی حیات سینمای مستقل ایران و حمایت از ساخت آثار تازه می‌رسد.",
  },
];

export function FaqSection() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  const items = fa ? FA : EN;

  return (
    <section
      dir={dir}
      className="mx-auto max-w-4xl px-6 pt-16 pb-20 md:px-10 md:pt-20 md:pb-24"
      aria-labelledby="faq-heading"
    >
      <div className="text-center">
        <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
          {fa ? "پرسش‌های متداول" : "FAQ"}
        </span>
        <h2
          id="faq-heading"
          className={`mt-4 font-display text-4xl font-medium leading-[1.05] tracking-[-0.025em] text-cream-bright md:text-6xl ${fa ? "font-vazir" : ""}`}
        >
          {fa ? (
            <>
              سؤالی دارید؟{" "}
              <span className="font-editorial italic font-normal text-amber">پاسخ اینجاست</span>.
            </>
          ) : (
            <>
              Questions?{" "}
              <span className="font-editorial italic font-normal text-amber">Answers</span>.
            </>
          )}
        </h2>
      </div>

      <ul className="mt-10 border-t border-cream/8">
        {items.map((item, i) => (
          <li key={i} className="border-b border-cream/8">
            <details className="group">
              <summary className="faq-summary flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-start transition-colors hover:text-cream-bright [&::-webkit-details-marker]:hidden">
                <span
                  className={`text-[16px] font-medium leading-snug text-cream/90 md:text-[18px] ${fa ? "font-vazir" : ""}`}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream/60 transition-all duration-300 group-open:rotate-45 group-open:border-amber/60 group-open:text-amber"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </summary>
              <div
                className={`pb-7 pe-12 text-[14.5px] leading-relaxed text-cream/65 md:text-[15px] ${fa ? "font-vazir" : ""}`}
              >
                {item.a}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: EN.map((it) => ({
              "@type": "Question",
              name: it.q,
              acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
          }),
        }}
      />
    </section>
  );
}
