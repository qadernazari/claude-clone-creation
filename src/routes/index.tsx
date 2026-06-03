import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "../lib/i18n";
import { supabase } from "../integrations/supabase/client";
import { Logo } from "../components/logo";
import { WelcomeSplash } from "../components/welcome-splash";
import { FilmsRow } from "../components/films-row";

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
    <div className="hairline inline-flex items-center gap-1 rounded-full border px-1 py-1 text-xs uppercase tracking-widest">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1 transition-colors ${
          locale === "en" ? "bg-cream text-ink" : "text-cream/70 hover:text-cream"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fa")}
        className={`rounded-full px-3 py-1 font-[var(--font-fa)] transition-colors ${
          locale === "fa" ? "bg-cream text-ink" : "text-cream/70 hover:text-cream"
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

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <WelcomeSplash />

      {/* Header */}
      <header className="hairline sticky top-0 z-30 border-b bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={44} />
          </a>
          <nav className="hidden gap-8 text-sm text-cream/70 md:flex">
            <a href="/" className="hover:text-cream">
              {locale === "fa" ? "خانه" : "Home"}
            </a>
            <a href="/" className="hover:text-cream">
              {locale === "fa" ? "آثار اختصاصی" : "Originals"}
            </a>
            <a href="/" className="hover:text-cream">
              {locale === "fa" ? "درباره" : "About"}
            </a>
          </nav>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-40">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
            {hero?.kicker}
          </p>
          <h1 className="max-w-3xl text-balance font-display text-5xl leading-[1.05] text-cream-bright md:text-7xl">
            {hero?.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/70">{hero?.subtitle}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-cream-bright">
              {locale === "fa" ? "تماشای آثار" : "Browse Originals"}
            </button>
            <button className="hairline rounded-full border px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-bg-1">
              {locale === "fa" ? "درباره‌ی ایران" : "About IRAN"}
            </button>
          </div>
        </div>
      </section>

      {/* Why IRAN */}
      <section className="hairline border-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="mb-12 font-display text-3xl text-cream-bright md:text-4xl">
            {locale === "fa" ? "چرا ایران" : "Why IRAN"}
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-line md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                en: ["Persian storytelling", "Original short films, in their authentic voice."],
                fa: ["روایت ایرانی", "آثار کوتاهِ اصیل، با صدای حقیقی‌شان."],
              },
              {
                en: ["Filmmaker support", "Artists are paid directly for their work."],
                fa: ["حمایت از فیلم‌ساز", "هزینه‌ی هر اثر، به دست خالقش می‌رسد."],
              },
              {
                en: ["Curated premieres", "Selected with care — never a feed."],
                fa: ["آثار منتخب", "با وسواس انتخاب‌شده — نه فهرستی بی‌پایان."],
              },
              {
                en: ["Watch anywhere", "Any modern browser, phone to TV."],
                fa: ["تماشای جهانی", "روی هر مرورگری — از موبایل تا تلویزیون."],
              },
            ].map((card, i) => {
              const [title, desc] = locale === "fa" ? card.fa : card.en;
              return (
                <div key={i} className="bg-bg-0 p-8">
                  <div className="mb-4 text-amber">●</div>
                  <h3 className="mb-2 font-display text-xl text-cream-bright">{title}</h3>
                  <p className="text-sm text-cream/65">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <FilmsRow />

      {/* Footer */}
      <footer className="hairline border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-12 text-xs text-cream/50 md:flex-row md:items-center">
          <Logo size={32} />
          <p>
            © {new Date().getFullYear()} IRAN ·{" "}
            {locale === "fa"
              ? "خانه‌ای برای سینمای کوتاه ایران"
              : "A home for contemporary Iranian cinema"}
          </p>
        </div>
      </footer>
    </div>
  );
}
