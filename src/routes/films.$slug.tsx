import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { AuthMenu } from "@/components/auth-menu";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/films/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("films")
      .select("*")
      .eq("slug", params.slug)
      .eq("visibility", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw notFound();
    return { film: data };
  },
  head: ({ loaderData }) => {
    const f = loaderData?.film;
    if (!f) return {};
    const title = `${f.title_en} — IRAN`;
    const desc = f.synopsis_en?.slice(0, 160) ?? "Original Iranian short film on IRAN.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(f.cover_url ? [{ property: "og:image" as const, content: f.cover_url }] : []),
      ],
    };
  },
  component: FilmPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">Back to home</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="text-center">
        <h1 className="font-display text-2xl">Film not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm underline">Back to home</Link>
      </div>
    </div>
  ),
});

type Credit = {
  credit_type: string;
  label_en: string | null;
  label_fa: string | null;
  value_en: string | null;
  value_fa: string | null;
  sort_order: number;
};

function FilmPage() {
  const { film } = Route.useLoaderData();
  const { locale, region, num, dir } = useLocale();
  const fa = locale === "fa";
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Log a "view" event (anon-allowed)
  useEffect(() => {
    supabase.from("events").insert({ type: "view", film_id: film.id }).then(() => {});
  }, [film.id]);

  const { data: credits = [] } = useQuery({
    queryKey: ["film", film.id, "credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("film_credits")
        .select("credit_type, label_en, label_fa, value_en, value_fa, sort_order")
        .eq("film_id", film.id)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data as Credit[]) ?? [];
    },
  });

  const title = fa ? film.title_fa || film.title_en : film.title_en;
  const director = fa ? film.director_fa || film.director_en : film.director_en;
  const synopsis = fa ? film.synopsis_fa || film.synopsis_en : film.synopsis_en;

  const priceLabel =
    region === "iran" && film.price_toman > 0
      ? `${num(film.price_toman)} ${fa ? "تومان" : "Toman"}`
      : `$${(film.price_cents / 100).toFixed(2)}`;

  const t = {
    buy: fa ? "خرید بلیط" : "Buy ticket",
    contribute: fa ? "حمایت می‌کنم" : "Contribute",
    signinToBuy: fa ? "ورود برای خرید بلیط" : "Sign in to buy a ticket",
    accessNote: fa
      ? `دسترسی ${num(film.ticket_hours)} ساعت پس از خرید`
      : `${film.ticket_hours}-hour access after purchase`,
    about: fa ? "درباره فیلم" : "About the film",
    crew: fa ? "عوامل" : "Credits",
    back: fa ? "بازگشت" : "Back",
    paymentsSoon: fa ? "پرداخت به‌زودی فعال می‌شود." : "Payments coming soon.",
  };

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-cream/10 bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={36} />
          </Link>
          <AuthMenu />
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {film.cover_url && (
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{ background: `center / cover no-repeat url(${film.cover_url})` }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-bg-0/70 to-bg-0" aria-hidden />

        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Link to="/" className="text-xs text-cream/60 hover:text-cream-bright">← {t.back}</Link>

          <div className="mt-6 grid gap-10 md:grid-cols-[300px_1fr] md:gap-12">
            <div
              className="hairline aspect-[2/3] w-full overflow-hidden rounded-xl border bg-bg-1"
              style={film.cover_url ? { background: `center / cover no-repeat url(${film.cover_url})` } : undefined}
              aria-hidden
            />

            <div>
              {film.category && (
                <span className="inline-flex rounded-full bg-cream/10 px-3 py-1 text-[11px] uppercase tracking-widest text-cream/70">
                  {film.category}
                </span>
              )}
              <h1 className={`mt-3 text-4xl md:text-5xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {title}
              </h1>
              {director && (
                <p className="mt-2 text-cream/70">
                  {fa ? "کارگردان: " : "Directed by "}{director}
                </p>
              )}
              <p className="mt-1 text-sm text-cream/55">
                {film.year ? num(film.year) : null}
                {film.year && film.duration_min ? " · " : null}
                {film.duration_min ? `${num(film.duration_min)} ${fa ? "دقیقه" : "min"}` : null}
              </p>

              {/* Purchase card */}
              <div className="mt-8 hairline rounded-xl border bg-bg-1/60 p-5 max-w-md">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-2xl font-medium text-cream-bright tabular-nums">{priceLabel}</div>
                    <div className="mt-1 text-xs text-cream/60">{t.accessNote}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {user ? (
                    <button
                      type="button"
                      disabled
                      title={t.paymentsSoon}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-amber px-4 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t.buy}
                    </button>
                  ) : (
                    <Link
                      to="/auth"
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-amber px-4 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 transition-colors"
                    >
                      {t.signinToBuy}
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled
                    title={t.paymentsSoon}
                    className="inline-flex items-center justify-center rounded-md border border-cream/20 px-4 py-2.5 text-sm font-medium text-cream/90 hover:bg-cream/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t.contribute}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-cream/40">{t.paymentsSoon}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Synopsis + Credits */}
      <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-12 md:grid-cols-[2fr_1fr]">
        {synopsis && (
          <div>
            <h2 className={`text-xs uppercase tracking-[0.2em] text-cream/50 ${fa ? "font-vazir" : ""}`}>
              {t.about}
            </h2>
            <p className="mt-4 whitespace-pre-line text-cream/85 leading-relaxed">{synopsis}</p>
          </div>
        )}

        {credits.length > 0 && (
          <aside>
            <h2 className={`text-xs uppercase tracking-[0.2em] text-cream/50 ${fa ? "font-vazir" : ""}`}>
              {t.crew}
            </h2>
            <dl className="mt-4 space-y-3">
              {credits.map((c, i) => (
                <div key={i} className="grid grid-cols-[110px_1fr] gap-3 text-sm">
                  <dt className="text-cream/50">
                    {fa ? c.label_fa || c.label_en : c.label_en}
                  </dt>
                  <dd className="text-cream/90">
                    {fa ? c.value_fa || c.value_en : c.value_en}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </section>
    </div>
  );
}
