import { useLocale } from "@/lib/i18n";

type QA = { q: string; a: string };

const EN: QA[] = [
  {
    q: "What is IRAN Membership?",
    a: "IRAN Membership is our monthly subscription that gives you unlimited streaming access to the full membership catalog — originals, documentaries, and curated collections from Iranian filmmakers. New titles are added regularly.",
  },
  {
    q: "How much does membership cost?",
    a: "Membership pricing is shown at checkout in your local currency. You can cancel anytime from your account, and your access continues until the end of the current billing period.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. New members get a 7-day free trial. You will not be charged during the trial, and you can cancel at any point before it ends with no charge.",
  },
  {
    q: "Can I watch films without a membership?",
    a: "Yes. Selected films are available as pay-per-view rentals, and some titles are free to watch. Premium releases may be sold separately even for members. Each film page shows exactly how it is available.",
  },
  {
    q: "Which films are included in membership?",
    a: "Any film marked as included in membership streams unlimited for active members. Films marked Premium are sold separately as pay-per-view. The film page always shows whether a title is included or premium.",
  },
  {
    q: "Can I watch on mobile, tablet, and TV?",
    a: "Yes. IRAN streams in any modern browser on phone, tablet, laptop, and smart TV. AirPlay and Chromecast are supported on devices that allow casting from the browser.",
  },
  {
    q: "How can I support filmmakers?",
    a: "Every film page has a Support the Filmmaker option. Your contribution goes directly toward keeping independent Iranian cinema alive and funding new work.",
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
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-start transition-colors hover:text-cream-bright">
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
