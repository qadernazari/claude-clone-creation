import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — IRAN" },
      {
        name: "description",
        content:
          "IRAN is a streaming platform for Iranian cinema. Original documentaries, curated short films, in English and Persian.",
      },
      { property: "og:title", content: "About — IRAN" },
      {
        property: "og:description",
        content:
          "IRAN is a streaming platform for Iranian cinema. Original documentaries, curated short films, in English and Persian.",
      },
      { property: "og:url", content: "https://ir.show/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/about" }],
  }),
  component: AboutPage,
});

type Section = {
  heading: { en: string; fa: string };
  body: { en: string; fa: string };
};

const SECTIONS: Section[] = [
  {
    heading: { en: "What we are", fa: "ما چه هستیم" },
    body: {
      en: "IRAN is a streaming platform dedicated entirely to Iranian cinema. We commission original documentaries, curate short films, and bring the voices of Iranian filmmakers to audiences everywhere — in English and Persian.",
      fa: "ایران تنها پلتفرم پخش اختصاصی سینمای ایران است. ما مستند اصیل می‌سازیم، فیلم کوتاه گزینش می‌کنیم و صدای فیلم‌سازان ایرانی را به مخاطبان جهانی می‌رسانیم — به فارسی و انگلیسی.",
    },
  },
  {
    heading: { en: "Why we built this", fa: "چرا این را ساختیم" },
    body: {
      en: "We built IRAN because we believe Iranian cinema deserves its own home. Not a subfolder on a general platform. Not a piracy site. A place built with care, where every film is chosen with intention and every filmmaker is treated with respect.",
      fa: "ایران را ساختیم چون باور داریم سینمای ایران خانه‌ای از آنِ خود می‌خواهد. نه یک زیرشاخه در یک پلتفرم عمومی. نه سایتی غیرقانونی. جایی که با دقت ساخته شده، هر فیلم با هدف انتخاب شده و هر فیلم‌ساز با احترام دیده می‌شود.",
    },
  },
  {
    heading: { en: "How it works", fa: "چطور کار می‌کند" },
    body: {
      en: "Every film on IRAN is available with a membership — one flat price, no auto-renewal, no algorithm pushing you toward something louder. Just films, carefully chosen, waiting to be watched.",
      fa: "همه فیلم‌ها با یک عضویت ساده در دسترس‌اند — قیمت ثابت، بدون تمدید خودکار، بدون الگوریتمی که شما را به سمت چیز دیگری هل دهد. فقط فیلم، با دقت انتخاب‌شده، منتظر دیده شدن.",
    },
  },
  {
    heading: { en: "The name", fa: "این نام" },
    body: {
      en: "We called it IRAN not as a political statement, but as a declaration of origin. These films come from Iran. They carry its light, its weight, and its humanity.",
      fa: "نام ایران را انتخاب کردیم، نه برای بیانیه‌ای سیاسی، بلکه برای اعلام یک خاستگاه. این فیلم‌ها از ایران می‌آیند. روشنایی، سنگینی و انسانیت آن را با خود دارند.",
    },
  },
];

function AboutPage() {
  const { locale } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={fa ? "rtl" : "ltr"} className="flex min-h-screen flex-col bg-bg-0">
      <SiteHeader current="about" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-24 pb-20 md:pt-36 md:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.12), transparent 60%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.40em] text-amber/90">
              {fa ? "درباره ایران" : "About IRAN"}
            </span>
            <h1
              className={`mt-6 font-display text-4xl font-medium leading-[1.05] tracking-[-0.025em] text-cream-bright md:text-6xl ${fa ? "font-vazir" : ""}`}
              style={{ textShadow: "0 12px 60px rgba(201,168,76,0.15)" }}
            >
              {fa ? "خانه‌ای برای سینمای ایران." : "A home for Iranian cinema."}
            </h1>
            <div className="mx-auto mt-8 h-px w-16 bg-amber/60" aria-hidden />
            <p
              className={`mx-auto mt-8 max-w-2xl text-[18px] leading-relaxed text-cream/80 md:text-[20px] ${fa ? "font-vazir" : ""}`}
            >
              {fa
                ? "ایران یکی از غنی‌ترین سنت‌های سینمایی جهان را دارد — با این حال بیشتر آن برای دنیا ناپیدا مانده است. ما اینجاییم تا این را تغییر دهیم."
                : "Iran has one of the world's most celebrated film traditions — yet most of it remains invisible to the world. IRAN exists to change that."}
            </p>
          </div>
        </section>

        {/* Sections */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-2xl">
            {SECTIONS.map((s, i) => (
              <article
                key={i}
                className={i > 0 ? "mt-14 border-t border-amber/15 pt-14" : ""}
              >
                <h2
                  className={`text-[11px] font-semibold uppercase tracking-[0.32em] text-amber ${fa ? "font-vazir" : ""}`}
                >
                  {fa ? s.heading.fa : s.heading.en}
                </h2>
                <p
                  className={`mt-5 text-[16px] leading-relaxed text-cream/70 ${fa ? "font-vazir" : ""}`}
                >
                  {fa ? s.body.fa : s.body.en}
                </p>
              </article>
            ))}

            {/* Closing */}
            <div className="mt-20 border-t border-amber/15 pt-14 text-center">
              <p
                className={`font-display text-2xl italic leading-snug tracking-[-0.01em] text-amber md:text-3xl ${fa ? "font-vazir not-italic" : ""}`}
              >
                {fa
                  ? "سینمای ایران، برای همه جهان."
                  : "Iranian cinema, streamed worldwide."}
              </p>
              <p className={`mt-10 text-[13px] text-cream/55 ${fa ? "font-vazir" : ""}`}>
                {fa ? "سوالی دارید؟ " : "Questions? "}
                <a
                  href="mailto:hello@ir.show"
                  className="text-cream/80 underline decoration-amber/40 underline-offset-4 transition-colors hover:text-amber"
                >
                  hello@ir.show
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
