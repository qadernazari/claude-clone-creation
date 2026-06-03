import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
              name: "Is there a subscription?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. You buy a ticket per film and get 48 hours of access. No recurring charges, ever.",
              },
            },
            {
              "@type": "Question",
              name: "Where does the money go?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The majority goes directly to the filmmakers. We keep a small share to run the platform.",
              },
            },
            {
              "@type": "Question",
              name: "Can I watch from inside Iran?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. We support Toman payment via ZarinPal, with the rest of the world paying in USD.",
              },
            },
            {
              "@type": "Question",
              name: "What devices are supported?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Any modern browser — laptop, phone, tablet, or smart TV. No app required.",
              },
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
      ? { kicker: "آثار کوتاه اختصاصی ایرانی", title: "سینما، با صدای واقعی‌اش.", subtitle: "بدون اشتراک — بلیت همان فیلمی که می‌خواهید." }
      : { kicker: "Original Iranian short films", title: "Cinema, in its true voice.", subtitle: "No subscription — pay only for what you watch." };

  // Split title for "true voice" italic accent (EN only — leave FA intact)
  const titleParts = locale === "en" && hero?.title?.toLowerCase().includes("true")
    ? hero.title.split(/\b(true)\b/i)
    : null;

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <WelcomeSplash />

      <SiteHeader current="home" />


      {/* Hero — cinematic bottom-aligned editorial spread */}
      <section className="relative flex min-h-screen items-end overflow-hidden px-6 pb-20 pt-32 md:px-12 md:pb-32">
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
          <h1 className="font-display text-6xl leading-[0.9] tracking-[-0.02em] text-cream-bright md:text-8xl lg:text-9xl">
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
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-cream/60 md:text-xl">
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
            <h2 className="font-display text-4xl font-bold leading-[1.05] text-cream-bright md:text-5xl">
              {locale === "fa" ? "بدون اشتراک. بدون تعهد." : "No subscription. No commitment."}
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                en: ["Choose a film", "Browse a tight, curated selection of original Iranian shorts."],
                fa: ["یک فیلم انتخاب کنید", "فهرستی کوتاه و دست‌چین از آثار کوتاه ایرانی."],
              },
              {
                en: ["Buy a single ticket", "Pay once for the film you want — supporting its maker directly."],
                fa: ["یک بلیت بخرید", "فقط برای همان اثر — مستقیم در حمایت سازنده‌اش."],
              },
              {
                en: ["Watch within 48 hours", "Stream on any device. Pause, resume, finish on your time."],
                fa: ["تا ۴۸ ساعت تماشا کنید", "روی هر دستگاهی — توقف، ادامه، در زمان خودتان."],
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
      <section className="border-t border-line px-6 py-28 md:px-12 md:py-32">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 md:grid-cols-[1fr_2fr]">
          <div>
            <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.4em] text-amber">
              {locale === "fa" ? "پرسش‌های متداول" : "Questions"}
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-cream-bright md:text-4xl">
              {locale === "fa" ? "هرچه باید بدانید." : "Everything you might ask."}
            </h2>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {[
              {
                en: ["Is there a subscription?", "No. You buy a ticket per film and get 48 hours of access. No recurring charges, ever."],
                fa: ["آیا اشتراک ماهانه دارد؟", "نه. برای هر فیلم یک بلیت می‌خرید و ۴۸ ساعت دسترسی دارید. هرگز کسر دوره‌ای نمی‌شود."],
              },
              {
                en: ["Where does the money go?", "The majority goes directly to the filmmakers. We keep a small share to run the platform."],
                fa: ["پول کجا می‌رود؟", "بخش عمده به‌طور مستقیم به فیلم‌ساز می‌رسد. سهم کوچکی برای نگه‌داری پلتفرم می‌ماند."],
              },
              {
                en: ["Can I watch from inside Iran?", "Yes. We support Toman payment via ZarinPal, with the rest of the world paying in USD."],
                fa: ["از داخل ایران هم می‌توان دید؟", "بله. پرداخت تومانی از طریق زرین‌پال، و سایر کشورها با دلار."],
              },
              {
                en: ["What devices are supported?", "Any modern browser — laptop, phone, tablet, or smart TV. No app required."],
                fa: ["چه دستگاه‌هایی پشتیبانی می‌شود؟", "هر مرورگر مدرنی — لپ‌تاپ، موبایل، تبلت یا تلویزیون هوشمند. بدون نیاز به برنامه."],
              },
            ].map((qa, i) => {
              const [q, a] = locale === "fa" ? qa.fa : qa.en;
              return (
                <details key={i} className="group py-6">
                  <summary className="flex cursor-pointer items-center justify-between gap-6 list-none">
                    <span className="font-display text-lg font-semibold text-cream-bright">{q}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream/60 transition-all group-open:rotate-45 group-open:border-amber/50 group-open:text-amber">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <dd className="mt-4 max-w-2xl text-[15px] leading-relaxed text-cream/60">{a}</dd>
                </details>
              );
            })}
          </dl>
        </div>
      </section>

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
              className="bg-amber px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-amber-bright"
            >
              {locale === "fa" ? "تماشای آثار" : "Browse Originals"}
            </a>
            <a
              href="/about"
              className="border border-cream/20 px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-cream transition-colors hover:bg-cream hover:text-ink"
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
