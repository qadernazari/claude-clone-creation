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

function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="hairline inline-flex items-center gap-0.5 rounded-full border bg-bg-1/60 p-1 text-[10px] uppercase tracking-widest">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-2.5 py-1 font-bold transition-colors ${
          locale === "en" ? "bg-amber text-ink" : "text-cream/40 hover:text-cream"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fa")}
        className={`rounded-full px-2.5 py-1 font-bold transition-colors ${
          locale === "fa" ? "bg-amber text-ink" : "text-cream/40 hover:text-cream"
        }`}
        aria-pressed={locale === "fa"}
      >
        فا
      </button>
    </div>
  );
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

      {/* Header */}
      <header className="fixed top-0 z-30 w-full border-b border-line bg-bg-0/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <div className="flex items-center gap-10">
            <a href="/" className="inline-flex items-center" aria-label="IRAN — home">
              <Logo size={36} />
            </a>
            <nav className="hidden gap-8 text-[11px] font-medium uppercase tracking-[0.2em] text-cream/60 md:flex">
              <a href="/" className="text-cream transition-colors">
                {locale === "fa" ? "خانه" : "Home"}
              </a>
              <a href="/browse" className="hover:text-cream transition-colors">
                {locale === "fa" ? "آثار اختصاصی" : "Originals"}
              </a>
              <a href="/about" className="hover:text-cream transition-colors">
                {locale === "fa" ? "درباره" : "About"}
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <AuthMenu />
          </div>
        </div>
      </header>

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

        <div className="relative z-10 max-w-5xl">
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.4em] text-amber">
            {hero?.kicker}
          </span>
          <h1 className="font-display text-6xl font-extrabold leading-[0.9] tracking-tight text-cream-bright md:text-8xl lg:text-9xl">
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
              className="bg-amber px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-amber-bright"
            >
              {locale === "fa" ? "تماشای آثار" : "Browse Originals"}
            </a>
            <a
              href="/about"
              className="border border-cream/20 px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-cream transition-colors hover:bg-cream hover:text-ink"
            >
              {locale === "fa" ? "درباره‌ی ایران" : "About IRAN"}
            </a>
          </div>
        </div>
      </section>

      {/* Why IRAN — value props with expanding gold bar */}
      <section className="border-y border-line px-6 py-28 md:px-12 md:py-32">
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

      {/* Footer — editorial */}
      <footer className="border-t border-line px-6 py-20 md:px-12 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-12 md:flex-row md:items-start">
            <div className="max-w-xs">
              <div className="mb-6">
                <Logo size={32} />
              </div>
              <p className="text-sm leading-relaxed text-cream/40">
                {locale === "fa"
                  ? "خانه‌ای برای سینمای معاصر ایران. حمایت از فیلم‌سازان مستقل، با روایت مستقیم."
                  : "A home for contemporary Iranian cinema. Supporting independent artists through direct storytelling."}
              </p>
            </div>

            <div className="flex gap-16 md:gap-24">
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                  {locale === "fa" ? "گردش" : "Explore"}
                </span>
                <a href="/" className="text-sm transition-colors hover:text-amber">{locale === "fa" ? "خانه" : "Home"}</a>
                <a href="/browse" className="text-sm transition-colors hover:text-amber">{locale === "fa" ? "آثار" : "Browse"}</a>
                <a href="/about" className="text-sm transition-colors hover:text-amber">{locale === "fa" ? "درباره" : "About"}</a>
                <a href="/contact" className="text-sm transition-colors hover:text-amber">{locale === "fa" ? "تماس" : "Contact"}</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                  {locale === "fa" ? "قانونی" : "Legal"}
                </span>
                <span className="cursor-default text-sm text-cream/60">{locale === "fa" ? "شرایط" : "Terms"}</span>
                <span className="cursor-default text-sm text-cream/60">{locale === "fa" ? "حریم خصوصی" : "Privacy"}</span>
              </div>
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30 md:flex-row">
            <span>
              © {new Date().getFullYear()} IRAN ·{" "}
              {locale === "fa" ? "تمامی حقوق محفوظ است" : "All rights reserved"}
            </span>
            <span>{locale === "fa" ? "برای روح مستقل" : "Designed for the independent spirit"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
