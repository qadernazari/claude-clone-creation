import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type PressFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  year: number | null;
  duration_min: number | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  cover_url: string | null;
  poster_gradient: string | null;
};

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press kit — IRAN" },
      {
        name: "description",
        content:
          "Stills, posters, logos, and contact details for journalists, festivals, and partners covering films on IRAN.",
      },
      { property: "og:title", content: "Press kit — IRAN" },
      {
        property: "og:description",
        content:
          "Stills, posters, logos, and contact details for journalists, festivals, and partners.",
      },
      { property: "og:url", content: "https://ir.show/press" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/press" }],
  }),
  component: PressPage,
});

function PressPage() {
  const { locale } = useLocale();
  const fa = locale === "fa";

  const { data: films, isLoading } = useQuery({
    queryKey: ["press", "films"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, year, duration_min, synopsis_en, synopsis_fa, cover_url, poster_gradient",
        )
        .eq("visibility", "published")
        .order("sort_order", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as PressFilm[];
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-bg-0 text-cream" dir={fa ? "rtl" : "ltr"}>
      <SiteHeader current="about" />

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="mb-5 text-xs uppercase tracking-[0.35em] text-amber">
            {fa ? "بسته‌ی مطبوعاتی" : "For press"}
          </p>
          <h1 className={`text-5xl leading-[1.05] text-cream-bright md:text-6xl ${fa ? "font-vazir" : "font-display"}`}>
            {fa ? "بسته‌ی مطبوعاتی" : "Press kit"}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/70">
            {fa
              ? "تصاویر، پوسترها، لوگو و اطلاعات تماس برای رسانه‌ها، جشنواره‌ها و همکاران."
              : "Stills, posters, logos, and contact details for journalists, festivals, and partners covering films on IRAN."}
          </p>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-2">
          <div className="hairline rounded-2xl border bg-bg-1/40 p-8">
            <p className="text-xs uppercase tracking-widest text-cream/50">
              {fa ? "ایمیل مطبوعات" : "Press inquiries"}
            </p>
            <a
              href="mailto:press@iran.film"
              className="mt-2 block text-lg text-cream-bright hover:text-amber"
            >
              press@iran.film
            </a>
            <p className="mt-3 text-sm text-cream/60">
              {fa
                ? "برای درخواست مصاحبه، نقد، یا پوشش رسانه‌ای ایمیل بزنید. معمولاً ظرف ۲ روز پاسخ می‌دهیم."
                : "Email us for interview requests, reviews, or media coverage. We usually reply within 2 business days."}
            </p>
          </div>
          <div className="hairline rounded-2xl border bg-bg-1/40 p-8">
            <p className="text-xs uppercase tracking-widest text-cream/50">
              {fa ? "جشنواره‌ها و همکاران" : "Festivals & partners"}
            </p>
            <a
              href="mailto:partners@iran.film"
              className="mt-2 block text-lg text-cream-bright hover:text-amber"
            >
              partners@iran.film
            </a>
            <p className="mt-3 text-sm text-cream/60">
              {fa
                ? "برای نمایش، توزیع، و همکاری با جشنواره‌ها."
                : "Festival screenings, distribution, and curatorial partnerships."}
            </p>
          </div>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className={`mb-6 text-3xl text-cream-bright md:text-4xl ${fa ? "font-vazir" : "font-display"}`}>
            {fa ? "درباره‌ی ایران" : "About IRAN"}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Stat
              label={fa ? "نام برند" : "Brand name"}
              value="IRAN"
              caption={fa ? "همیشه با حروف بزرگ" : "Always set in uppercase"}
            />
            <Stat
              label={fa ? "نشانی وب" : "URL"}
              value="ir.show"
              caption={fa ? "نشانی رسمی" : "Canonical domain"}
            />
            <Stat
              label={fa ? "زبان‌ها" : "Languages"}
              value={fa ? "فارسی · انگلیسی" : "Persian · English"}
              caption={fa ? "هم‌شأن در سراسر سایت" : "First-class throughout"}
            />
          </div>
          <p className="mt-10 max-w-3xl text-cream/75">
            {fa
              ? "ایران یک پلتفرم پخش بلیتی و بدون اشتراک برای فیلم‌های کوتاهِ اختصاصی ایرانی است. هر بلیت یک حمایت مستقیم از فیلم‌ساز است."
              : "IRAN is a bilingual streaming home for Iranian short films. Monthly membership with a 7-day free trial, plus Premium rentals for select releases. Filmmakers are paid transparently on every stream and every ticket."}
          </p>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className={`text-3xl text-cream-bright md:text-4xl ${fa ? "font-vazir" : "font-display"}`}>
              {fa ? "فیلم‌ها و تصاویر" : "Films & stills"}
            </h2>
            <p className="text-xs uppercase tracking-widest text-cream/50">
              {fa
                ? "روی هر تصویر کلیک راست کنید و «ذخیره» را بزنید"
                : "Right-click any image and choose Save image"}
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/10] animate-pulse rounded-xl bg-bg-1/60"
                />
              ))}
            </div>
          ) : !films || films.length === 0 ? (
            <p className="text-cream/60">
              {fa ? "هنوز فیلمی منتشر نشده است." : "No films published yet."}
            </p>
          ) : (
            <div className="grid gap-10 md:grid-cols-2">
              {films.map((f) => {
                const title = fa && f.title_fa ? f.title_fa : f.title_en;
                const director = fa && f.director_fa ? f.director_fa : f.director_en;
                const synopsis = fa && f.synopsis_fa ? f.synopsis_fa : f.synopsis_en;
                return (
                  <article key={f.id} className="space-y-4">
                    <a
                      href={f.cover_url ?? `/films/${f.slug}`}
                      target={f.cover_url ? "_blank" : undefined}
                      rel={f.cover_url ? "noopener noreferrer" : undefined}
                      className="group block overflow-hidden rounded-xl hairline border"
                    >
                      {f.cover_url ? (
                        <img
                          src={f.cover_url}
                          alt={`${title} — still`}
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div
                          className="aspect-[16/10] w-full"
                          style={{
                            background:
                              f.poster_gradient ??
                              "linear-gradient(135deg, oklch(0.30 0.05 60), oklch(0.20 0.04 40))",
                          }}
                        />
                      )}
                    </a>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                          {title}
                        </h3>
                        <p className="mt-1 text-sm text-cream/60">
                          {[director, f.year, f.duration_min ? `${f.duration_min} min` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <a
                        href={`/films/${f.slug}`}
                        className="shrink-0 text-xs uppercase tracking-widest text-amber hover:text-amber/80"
                      >
                        {fa ? "صفحه فیلم →" : "Film page →"}
                      </a>
                    </div>
                    {synopsis && (
                      <p className="text-sm leading-relaxed text-cream/70 line-clamp-3">
                        {synopsis}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-cream/50">{label}</p>
      <p className="mt-2 font-display text-2xl text-cream-bright">{value}</p>
      {caption && <p className="mt-1 text-xs text-cream/55">{caption}</p>}
    </div>
  );
}
