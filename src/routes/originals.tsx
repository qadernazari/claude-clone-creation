import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/originals")({
  head: () => ({
    meta: [
      { title: "ir.show Originals — Iranian Cinema" },
      {
        name: "description",
        content:
          "Original Iranian films produced exclusively for ir.show. Watch award-winning shorts, documentaries, and Walking Tours.",
      },
      { property: "og:title", content: "ir.show Originals — Iranian Cinema" },
      {
        property: "og:description",
        content:
          "Original Iranian films produced exclusively for ir.show. Shorts, documentaries, and Walking Tours.",
      },
      { property: "og:url", content: "https://ir.show/originals" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/originals" }],
  }),
  component: OriginalsPage,
});

type FilmRow = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  year: number | null;
  thumbnail_url: string | null;
  cover_url: string | null;
};

function OriginalsPage() {
  const { locale, dir, year } = useLocale();
  const fa = locale === "fa";

  const { data: films = [] } = useQuery<FilmRow[]>({
    queryKey: ["originals-films"],
    queryFn: async () => {
      const { data } = await supabase
        .from("films")
        .select("id, slug, title_en, title_fa, year, thumbnail_url, cover_url")
        .eq("visibility", "published")
        .order("created_at", { ascending: false });
      return (data ?? []) as FilmRow[];
    },
  });

  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6 md:px-10 md:pt-36">
        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber">
            {fa ? "اختصاصی" : "Exclusive"}
          </p>
          <h1
            className={`mt-2 text-4xl text-cream-bright sm:text-5xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "فیلم‌های اصلی" : "ir.show Originals"}
          </h1>
          <p
            className={`mt-4 max-w-xl text-sm leading-relaxed text-cream/65 ${fa ? "font-vazir" : ""}`}
          >
            {fa
              ? "فیلم‌های اصیل ایرانی که به‌طور اختصاصی برای ir.show تولید شده‌اند."
              : "Original Iranian films produced exclusively for ir.show — shorts, documentaries, and Walking Tours."}
          </p>
        </header>

        {films.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className={`text-cream/50 ${fa ? "font-vazir" : ""}`}>
              {fa ? "به زودی فیلم‌های جدید اضافه می‌شوند." : "New originals coming soon."}
            </p>
            <Link to="/browse" className="mt-6 text-sm text-amber hover:underline">
              {fa ? "مشاهده همه فیلم‌ها" : "Browse all films"} →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {films.map((film) => {
              const displayTitle = fa ? film.title_fa || film.title_en : film.title_en;
              const desktopImg = film.thumbnail_url || film.cover_url;
              const mobileImg = film.cover_url || film.thumbnail_url;
              return (
                <Link
                  key={film.id}
                  to="/films/$slug"
                  params={{ slug: film.slug }}
                  className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-1 lg:aspect-video"
                >
                  {desktopImg || mobileImg ? (
                    <picture>
                      <source media="(min-width: 1024px)" srcSet={desktopImg || undefined} />
                      <img
                        src={mobileImg || desktopImg || undefined}
                        alt={displayTitle}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-bg-1 to-bg-0" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p
                      className={`line-clamp-2 text-sm font-medium text-cream-bright ${fa ? "font-vazir" : "font-display"}`}
                    >
                      {displayTitle}
                    </p>
                    {film.year ? (
                      <p className="mt-0.5 text-[11px] text-cream/55">{film.year}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
