import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../lib/i18n";
import { supabase } from "../integrations/supabase/client";
import { WelcomeSplash } from "../components/welcome-splash";
import { FilmsRow } from "../components/films-row";
import { FeaturedFilm } from "../components/featured-film";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IRAN — Original Iranian short films" },
      {
        name: "description",
        content:
          "Premium home for original Persian short films. Ticket-based, bilingual, no subscription.",
      },
      { property: "og:title", content: "IRAN — Original Iranian short films" },
      {
        property: "og:description",
        content: "Premium home for original Persian short films. Ticket-based, bilingual.",
      },
      { property: "og:url", content: "https://ir.show/" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "IRAN",
          url: "https://ir.show",
          description:
            "A premium streaming home for original Iranian short films. Ticket-based, bilingual, no subscription.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "IRAN",
          url: "https://ir.show",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does membership work?",
              acceptedAnswer: { "@type": "Answer", text: "A monthly membership unlocks unlimited streaming of the standard catalog. Start with a 7-day free trial. Select premium releases are sold separately." },
            },
            {
              "@type": "Question",
              name: "What makes IRAN different?",
              acceptedAnswer: { "@type": "Answer", text: "IRAN is dedicated to independent Iranian cinema, bringing together original films, emerging filmmakers, and carefully curated stories from across Iran and its global creative community." },
            },
            {
              "@type": "Question",
              name: "How long do I have to watch a film?",
              acceptedAnswer: { "@type": "Answer", text: "Once your viewing window begins, you'll have 48 hours to watch the film at your own pace." },
            },
            {
              "@type": "Question",
              name: "Can I watch on any device?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. Watch seamlessly on desktop, tablet, mobile, or smart TV through any modern web browser." },
            },
            {
              "@type": "Question",
              name: "Do you add new films regularly?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. New films, documentaries, and original productions are added throughout the year, with a focus on quality and curation." },
            },
            {
              "@type": "Question",
              name: "Can I watch from anywhere in the world?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. IRAN is designed for audiences worldwide who want to discover and experience Iranian cinema." },
            },
          ],

        }),
      },
    ],
  }),
  component: Home,
});

type SettingsBlob = {
  site_default_access: "free" | "paid";
  hero: {
    en: { kicker: string; title: string; subtitle: string };
    fa: { kicker: string; title: string; subtitle: string };
  };
};

function useSiteContent<T>(key: string) {
  return useQuery({
    queryKey: ["site_content", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("data")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.data as T) ?? null;
    },
    staleTime: 60_000,
  });
}


function Home() {
  const { locale, t } = useLocale();
  const settings = useSiteContent<SettingsBlob>("settings");
  const hero = settings.data?.hero
    ? t(settings.data.hero)
    : locale === "fa"
      ? { kicker: "خانه‌ی سینمای ایرانی", title: "سینما، با صدای واقعی‌اش.", subtitle: "نامحدود تماشا کنید با عضویت ایران — هفت روز رایگان." }
      : { kicker: "Home of Iranian cinema", title: "Cinema, in its true voice.", subtitle: "Unlimited streaming with IRAN membership. 7 days free." };

  // Split title for "true voice" italic accent (EN only — leave FA intact)
  const titleParts = locale === "en" && hero?.title?.toLowerCase().includes("true")
    ? hero.title.split(/\b(true)\b/i)
    : null;

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <WelcomeSplash />

      <SiteHeader current="home" />


      {/* Hero — cinematic bottom-aligned editorial spread */}
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden px-5 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 md:px-12 md:pb-32">
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-bg-0 via-bg-0/40 to-transparent" />
        <div
          className="pointer-events-none absolute right-0 top-0 z-0 h-full w-2/3"
          style={{
            background:
              "radial-gradient(circle at 65% 30%, oklch(0.77 0.115 80 / 0.10), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute left-0 top-0 z-0 h-full w-1/2 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 20% 40%, oklch(0.30 0.04 60 / 0.4), transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-5xl fade-up">
          <span className="mb-6 block text-[11px] font-semibold uppercase tracking-[0.4em] text-amber">
            {hero?.kicker}
          </span>
          <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] text-cream-bright sm:text-6xl sm:leading-[0.9] md:text-8xl lg:text-9xl">
            {titleParts ? (
              <>
                {titleParts[0]}
                <span className="font-editorial italic font-normal text-amber-bright">true</span>
                {titleParts.slice(2).join("")}
              </>
            ) : (
              hero?.title
            )}
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-cream/60 sm:mt-10 sm:text-lg md:text-xl">
            {hero?.subtitle}
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <a
              href="/browse"
              className="group inline-flex items-center gap-2 rounded-full bg-amber px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:bg-amber-bright hover:gap-3 hover:shadow-[0_8px_30px_-8px_oklch(0.77_0.115_80/0.5)]"
            >
              {locale === "fa" ? "تماشای آثار" : "Browse Originals"}
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="/about"
              className="inline-flex items-center rounded-full border border-cream/20 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-cream transition-all duration-300 hover:border-cream/60 hover:bg-cream/5"
            >
              {locale === "fa" ? "درباره‌ی ایران" : "About IRAN"}
            </a>
          </div>
        </div>
      </section>

      {/* Why IRAN — value props with expanding gold bar */}
      <section aria-labelledby="why-iran" className="border-y border-line px-6 py-28 md:px-12 md:py-32">
        <h2 id="why-iran" className="sr-only">{locale === "fa" ? "چرا ایران" : "Why IRAN"}</h2>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-4">
          {[
            {
              en: ["Persian storytelling", "Original short films told in their most authentic, unedited voices."],
              fa: ["روایت ایرانی", "آثار کوتاهِ اصیل، با صدای حقیقی و دست‌نخورده."],
            },
            {
              en: ["Filmmaker support", "Artists are compensated directly, ensuring the future of independent cinema."],
              fa: ["حمایت از فیلم‌ساز", "هزینه‌ی هر اثر، مستقیم به دست خالقش می‌رسد."],
            },
            {
              en: ["Curated premieres", "Strictly selected works. A curated sanctuary, never a generic feed."],
              fa: ["آثار منتخب", "با وسواس انتخاب‌شده — نه فهرستی بی‌پایان."],
            },
            {
              en: ["Watch anywhere", "Seamless streaming across any modern browser, phone, or smart TV."],
              fa: ["تماشای جهانی", "روی هر مرورگری — از موبایل تا تلویزیون."],
            },
          ].map((card, i) => {
            const [title, desc] = locale === "fa" ? card.fa : card.en;
            return (
              <div key={i} className="group">
                <div className="mb-6 h-[2px] w-2 bg-amber transition-all duration-500 group-hover:w-12" />
                <h3 className="mb-4 font-display text-xl font-bold text-cream-bright">{title}</h3>
                <p className="text-sm leading-relaxed text-cream/50">{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured film + Originals grid */}
      <FeaturedFilm />
      <section className="px-6 pb-32 md:px-12">
        <div className="mx-auto max-w-7xl">
          <FilmsRow />
        </div>
      </section>

      {/* How it works — 3 step ritual */}
      <section className="border-t border-line px-6 py-28 md:px-12 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 max-w-2xl">
            <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.4em] text-amber">
              {locale === "fa" ? "چطور کار می‌کند" : "How it works"}
            </span>
            <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-cream-bright md:text-5xl">
              {locale === "fa" ? "یک عضویت. تمام سینمای ایران." : "One membership. All of Iranian cinema."}
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                en: ["Start your free trial", "Seven days on us. Cancel anytime — no questions."],
                fa: ["شروع رایگان", "هفت روز رایگان. هر زمان، بی‌چون‌وچرا لغو کنید."],
              },
              {
                en: ["Stream the whole catalog", "Unlimited access to standard films. Premium releases sold separately."],
                fa: ["تماشای کامل مجموعه", "دسترسی نامحدود به آثار استاندارد. آثار ویژه جداگانه."],
              },
              {
                en: ["Watch anywhere", "On any device, any browser. Pause, resume, finish on your time."],
                fa: ["تماشای جهانی", "روی هر دستگاه و مرورگری. توقف و ادامه در زمان خودتان."],
              },
            ].map((step, i) => {
              const [title, desc] = locale === "fa" ? step.fa : step.en;
              return (
                <li key={i} className="relative">
                  <div className="mb-6 flex items-baseline gap-4">
                    <span className="font-display text-5xl font-extrabold text-amber/30 tabular-nums">
                      0{i + 1}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-cream-bright">{title}</h3>
                  <p className="text-sm leading-relaxed text-cream/55">{desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* Closing CTA */}
      <section className="relative overflow-hidden border-t border-line px-6 py-32 md:px-12 md:py-40">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 60%, oklch(0.77 0.115 80 / 0.10), transparent 65%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-cream-bright md:text-6xl">
            {locale === "fa" ? (
              <>
                سینمای ایران،{" "}
                <span className="font-editorial italic font-normal text-amber-bright">دست‌نخورده</span>.
              </>
            ) : (
              <>
                Iranian cinema,{" "}
                <span className="font-editorial italic font-normal text-amber-bright">unfiltered</span>.
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/55 md:text-lg">
            {locale === "fa"
              ? "بلیتی بخرید، فیلم‌سازی را حمایت کنید، و آثاری ببینید که جای دیگری پیدا نمی‌کنید."
              : "Buy a ticket, support a filmmaker, and watch work you won't find anywhere else."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="/browse"
              className="group inline-flex items-center gap-2 rounded-full bg-amber px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:bg-amber-bright hover:gap-3 hover:shadow-[0_8px_30px_-8px_oklch(0.77_0.115_80/0.5)]"
            >
              {locale === "fa" ? "تماشای آثار" : "Browse Originals"}
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="/about"
              className="inline-flex items-center rounded-full border border-cream/20 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-cream transition-all duration-300 hover:border-cream/60 hover:bg-cream/5"
            >
              {locale === "fa" ? "درباره‌ی ایران" : "Our story"}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}

const FAQ_ITEMS: { en: [string, string]; fa: [string, string] }[] = [
  {
    en: ["Do I need a subscription?", "No. Purchase access only to the films you want to watch. No monthly fees and no recurring charges."],
    fa: ["آیا به اشتراک نیاز دارم؟", "خیر. تنها برای فیلمی که می‌خواهید تماشا کنید هزینه پرداخت می‌کنید؛ بدون اشتراک ماهانه و هزینه‌های دوره‌ای."],
  },
  {
    en: ["What makes IRAN different?", "IRAN is dedicated to independent Iranian cinema, bringing together original films, emerging filmmakers, and carefully curated stories from across Iran and its global creative community."],
    fa: ["چه چیزی ایران را متفاوت می‌کند؟", "ایران خانه‌ای برای سینمای مستقل ایران است؛ جایی که فیلم‌سازان فرصت دیده‌شدن پیدا می‌کنند و مخاطبان به مجموعه‌ای گزینش‌شده از آثار ایرانی دسترسی دارند."],
  },
  {
    en: ["How long do I have to watch a film?", "Once your viewing window begins, you'll have 48 hours to watch the film at your own pace."],
    fa: ["پس از خرید تا چه مدت می‌توانم فیلم را تماشا کنم؟", "پس از فعال‌شدن دسترسی، تا ۴۸ ساعت فرصت دارید فیلم را با آرامش تماشا کنید."],
  },
  {
    en: ["Can I watch on any device?", "Yes. Watch seamlessly on desktop, tablet, mobile, or smart TV through any modern web browser."],
    fa: ["روی چه دستگاه‌هایی می‌توانم تماشا کنم؟", "موبایل، تبلت، لپ‌تاپ و تلویزیون هوشمند؛ هرجا که مرورگر مدرن داشته باشید."],
  },
  {
    en: ["Do you add new films regularly?", "Yes. New films, documentaries, and original productions are added throughout the year, with a focus on quality and curation."],
    fa: ["آیا آثار جدید اضافه می‌شوند؟", "بله. به‌طور مستمر فیلم‌های تازه، مستندها و آثار اختصاصی به مجموعه افزوده می‌شوند."],
  },
  {
    en: ["Can I watch from anywhere in the world?", "Yes. IRAN is designed for audiences worldwide who want to discover and experience Iranian cinema."],
    fa: ["آیا از خارج از ایران هم می‌توانم تماشا کنم؟", "بله. این پلتفرم برای مخاطبان فارسی‌زبان و علاقه‌مندان به سینمای ایران در سراسر جهان طراحی شده است."],
  },
];

function FaqSection() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [open, setOpen] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!listRef.current) return;
      if (!listRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <section className="border-t border-line px-5 py-20 sm:px-6 sm:py-28 md:px-12 md:py-32" dir={fa ? "rtl" : "ltr"}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:gap-16 md:grid-cols-[1fr_2fr]">
        <div>
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.4em] text-amber">
            {fa ? "پرسش‌های متداول" : "Questions"}
          </span>
          <h2 className={`text-3xl font-bold leading-tight text-cream-bright md:text-4xl ${fa ? "font-fa" : "font-display"}`}>
            {fa ? "هرچه باید بدانید" : "Everything You Need to Know"}
          </h2>
        </div>
        <div ref={listRef} className="divide-y divide-line border-y border-line">
          {FAQ_ITEMS.map((qa, i) => {
            const [q, a] = fa ? qa.fa : qa.en;
            const isOpen = open === i;
            return (
              <div key={i} className="py-2">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-4 py-5 text-start md:gap-6 md:py-6 ${fa ? "font-fa" : ""}`}
                >
                  <span className={`text-[15px] md:text-lg font-semibold text-cream-bright ${fa ? "font-fa" : "font-display"}`}>{q}</span>
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition-all duration-300 md:h-9 md:w-9 md:text-base ${
                      isOpen ? "border-amber/60 text-amber bg-amber/5" : "border-cream/15 text-cream/60"
                    }`}
                    aria-hidden
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  className={`grid overflow-hidden transition-all duration-500 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0">
                    <p className={`max-w-2xl pb-7 pe-10 text-[15px] md:text-base leading-[1.85] text-cream/65 ${fa ? "font-fa" : ""}`}>
                      {a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
