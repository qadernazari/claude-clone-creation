import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useLocale } from "../lib/i18n";

type Category = {
  id: string;
  name_en: string;
  name_fa: string | null;
  sort_order: number | null;
};

type Film = {
  id: string;
  slug: string;
  category: string | null;
  cover_url: string | null;
  poster_gradient: string | null;
};

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.28 0.05 ${a}) 0%, oklch(0.40 0.08 ${b}) 100%)`;
}

export function CollectionsGrid() {
  const { locale, t } = useLocale();
  const fa = locale === "fa";

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_en, name_fa, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as Category[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: films } = useQuery({
    queryKey: ["films", "for-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select("id, slug, category, cover_url, poster_gradient")
        .eq("visibility", "published")
        .not("cover_url", "is", null);
      if (error) throw error;
      return (data as Film[]) ?? [];
    },
    staleTime: 60_000,
  });

  const tiles = useMemo(() => {
    if (!categories || !films) return [];
    const byCat = new Map<string, Film[]>();
    for (const f of films) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    return categories
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 1)
      .slice(0, 6)
      .map((c) => {
        const list = byCat.get(c.id) ?? [];
        const cover = list[0];
        return {
          id: c.id,
          name: t({ en: c.name_en, fa: c.name_fa || c.name_en }),
          slug: c.id,
          bg: cover?.cover_url
            ? `center / cover no-repeat url(${cover.cover_url})`
            : cover?.poster_gradient || fallbackGradient(c.id),
          count: list.length,
        };
      });
  }, [categories, films, t]);

  if (tiles.length === 0) return null;

  return (
    <section className="relative px-6 md:px-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <span className="mb-2.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
              {fa ? "مجموعه‌ها" : "Collections"}
            </span>
            <h2 className="font-editorial text-3xl italic font-normal text-cream-bright md:text-4xl">
              {fa ? "مقصدهای منتخب" : "Curated destinations"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <a
              key={tile.id}
              href={`/browse?category=${encodeURIComponent(tile.slug)}`}
              className="group relative block aspect-[16/10] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/[0.06] transition-all duration-500 hover:ring-cream/20"
            >
              <div className="cine-img absolute inset-0" style={{ background: tile.bg }} />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-cream-bright md:text-2xl">
                  {tile.name}
                </h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-cream/55">
                  {fa ? `${tile.count} اثر` : `${tile.count} ${tile.count === 1 ? "film" : "films"}`}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
