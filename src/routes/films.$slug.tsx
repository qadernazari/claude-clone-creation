import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import { FilmCheckout } from "@/components/film-checkout";
import { MembershipCheckout } from "@/components/membership-checkout";
import { ContributeModal } from "@/components/contribute-modal";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { WatchlistButton } from "@/components/watchlist-button";
import { useSubscription, memberCanAccess, ppvAvailable } from "@/hooks/use-subscription";
import { useEffect, useMemo, useState } from "react";

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
  head: ({ params, loaderData }) => {
    const f = loaderData?.film;
    if (!f) return {};
    const title = `${f.title_en} — IRAN`;
    const desc = f.synopsis_en?.slice(0, 160) ?? "Original Iranian short film on IRAN.";
    const url = `https://ir.show/films/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: url },
        ...(f.cover_url ? [{ property: "og:image" as const, content: f.cover_url }] : []),
        ...(f.cover_url ? [{ name: "twitter:image" as const, content: f.cover_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name: f.title_en,
            ...(f.director_en ? { director: { "@type": "Person", name: f.director_en } } : {}),
            ...(f.year ? { datePublished: String(f.year) } : {}),
            ...(f.cover_url ? { image: f.cover_url } : {}),
            ...(f.synopsis_en ? { description: f.synopsis_en } : {}),
            url,
          }),
        },
      ],
    };
  },
  component: FilmPage,
  errorComponent: ({ error }) => {
    console.error("films.$slug error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">Back to home</Link>
        </div>
      </div>
    );
  },
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

type RelatedFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  duration_min: number | null;
  year: number | null;
  cover_url: string | null;
  poster_gradient: string | null;
};

const fallbackGradient = "linear-gradient(135deg, oklch(0.25 0.05 270), oklch(0.18 0.03 240))";

function FilmPage() {
  const { film } = Route.useLoaderData();
  const { locale, region, num, dir } = useLocale();
  const fa = locale === "fa";
  const { isMember } = useSubscription();
  const [user, setUser] = useState<User | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [contribOpen, setContribOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const { data: activeTicket } = useQuery({
    queryKey: ["ticket", film.id, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, expires_at")
        .eq("film_id", film.id)
        .eq("status", "paid")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    refetchInterval: 30_000,
  });

  const { data: related = [] } = useQuery({
    queryKey: ["film", film.id, "related", film.category],
    queryFn: async () => {
      const q = supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, duration_min, year, cover_url, poster_gradient"
        )
        .eq("visibility", "published")
        .neq("id", film.id)
        .order("sort_order", { ascending: true })
        .limit(6);
      if (film.category) q.eq("category", film.category);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as RelatedFilm[]) ?? [];
    },
  });

  const title = fa ? film.title_fa || film.title_en : film.title_en;
  const director = fa ? film.director_fa || film.director_en : film.director_en;
  const synopsis = fa ? film.synopsis_fa || film.synopsis_en : film.synopsis_en;

  const priceLabel =
    region === "iran" && film.price_toman > 0
      ? `${num(film.price_toman)} ${fa ? "تومان" : "Toman"}`
      : `$${(film.price_cents / 100).toFixed(2)}`;

  // Group credits by type for nicer rendering
  const groupedCredits = useMemo(() => {
    const groups = new Map<string, Credit[]>();
    for (const c of credits) {
      const key = c.credit_type || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    return Array.from(groups.entries());
  }, [credits]);

  const t = {
    buy: fa ? "خرید بلیط" : "Buy ticket",
    watch: fa ? "تماشای فیلم" : "Watch now",
    startTrial: fa ? "آغاز رایگان ۷ روزه" : "Start 7-day free trial",
    contribute: fa ? "حمایت می‌کنم" : "Contribute",
    signinToBuy: fa ? "ورود برای خرید بلیط" : "Sign in to buy a ticket",
    signinToWatch: fa ? "برای تماشا وارد شوید" : "Sign in to watch",
    accessNote: fa
      ? `دسترسی ${num(film.ticket_hours)} ساعت پس از خرید`
      : `${film.ticket_hours}-hour access after purchase`,
    membershipNote: fa
      ? "با عضویت ایران، نامحدود تماشا کنید"
      : "Unlimited streaming with IRAN membership",
    memberIncluded: fa ? "شامل عضویت شماست" : "Included in your membership",
    premiumNote: fa
      ? "این اثر ویژه و خارج از عضویت است"
      : "Premium release — sold separately from membership",
    ticketActive: fa ? "بلیط فعال دارید" : "You have an active ticket",
    about: fa ? "درباره فیلم" : "Synopsis",
    crew: fa ? "عوامل" : "Credits",
    back: fa ? "بازگشت" : "Back",
    contribSoon: fa ? "حمایت به‌زودی فعال می‌شود." : "Contributions coming soon.",
    tomanSoon: fa ? "پرداخت با تومان (زرین‌پال) به‌زودی." : "Toman checkout (ZarinPal) coming soon.",
    playPreview: fa ? "پخش تیزر" : "Watch trailer",
    share: fa ? "هم‌رسانی" : "Share",
    copied: fa ? "لینک کپی شد" : "Link copied",
    moreFromCat: fa ? "بیشتر از این دسته" : "More to explore",
    orBuy: fa ? "یا فقط این فیلم را بخرید" : "Or buy this film",
    creditGroups: {
      cast: fa ? "بازیگران" : "Cast",
      crew: fa ? "عوامل تولید" : "Crew",
      music: fa ? "موسیقی" : "Music",
      production: fa ? "تولید" : "Production",
      other: fa ? "سایر" : "Other",
    } as Record<string, string>,
  };

  const tomanOnly = region === "iran" && film.price_toman > 0;
  const returnUrl = typeof window !== "undefined"
    ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&film=${film.slug}`
    : "";

  const posterStyle = film.cover_url
    ? { background: `center / cover no-repeat url(${film.cover_url})` }
    : { background: (film.poster_gradient as string) || fallbackGradient };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — IRAN`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <SiteHeader />


      {/* Cinematic hero */}
      <section className="relative isolate overflow-hidden">
        {/* Backdrop layers */}
        <div className="absolute inset-0 -z-20" style={posterStyle} aria-hidden />
        <div
          className="absolute inset-0 -z-10 backdrop-blur-2xl"
          style={{ background: "linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.85) 60%, var(--background) 100%)" }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl px-6 pt-10 md:pt-12 pb-14 md:pb-20">
          <Link to="/" className="text-xs uppercase tracking-widest text-cream/55 hover:text-cream-bright transition-colors">
            ← {t.back}
          </Link>

          <div className="mt-8 grid gap-10 md:grid-cols-[320px_1fr] md:gap-14">
            {/* Poster */}
            <div className="relative group">
              <div
                className="hairline aspect-[2/3] w-full overflow-hidden rounded-xl border shadow-2xl shadow-black/50"
                style={posterStyle}
                aria-hidden
              />
              {film.preview_url && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 hover:bg-black/40 transition-colors"
                  aria-label={t.playPreview}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber/95 text-bg-0 shadow-xl transition-transform group-hover:scale-105">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="absolute bottom-3 inset-x-0 text-center text-[11px] uppercase tracking-widest text-cream/90 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.playPreview}
                  </span>
                </button>
              )}
            </div>

            {/* Meta + purchase */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {film.is_premium && (
                  <span className="inline-flex items-center rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-bright">
                    {fa ? "اکران ویژه" : "Premium Release"}
                  </span>
                )}
                {film.category && (
                  <span className="inline-flex rounded-full bg-cream/10 px-3 py-1 text-[11px] uppercase tracking-widest text-cream/70">
                    {film.category}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-cream/[0.04] px-3 py-1 text-[11px] uppercase tracking-widest text-cream/70 hover:text-cream-bright hover:border-cream/30 transition-colors"
                >
                  {copied ? t.copied : t.share}
                </button>
                <WatchlistButton filmId={film.id} variant="icon" />
              </div>

              <h1 className={`mt-5 text-4xl md:text-6xl font-medium leading-[1.02] tracking-[-0.04em] text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {title}
              </h1>
              {director && (
                <p className="mt-3 text-cream/75">
                  {fa ? "کارگردان: " : "Directed by "}
                  <span className="text-cream-bright">{director}</span>
                </p>
              )}
              <p className="mt-1 text-sm text-cream/50">
                {film.year ? num(film.year) : null}
                {film.year && film.duration_min ? " · " : null}
                {film.duration_min ? `${num(film.duration_min)} ${fa ? "دقیقه" : "min"}` : null}
              </p>

              {/* Access card — member-aware */}
              {(() => {
                const accessType = film.access_type ?? "membership";
                const canMemberWatch = memberCanAccess(accessType);
                const hasPpv = ppvAvailable(accessType);
                const showWatchNow = !!activeTicket || (isMember && canMemberWatch) || accessType === "free";
                const primaryLabel = showWatchNow ? t.watch : isMember ? t.buy : t.startTrial;

                return (
                  <div className="mt-8 hairline rounded-2xl border bg-bg-1/70 backdrop-blur p-6 max-w-md">
                    <div className="text-sm text-cream/75">
                      {showWatchNow
                        ? activeTicket
                          ? t.ticketActive
                          : isMember && canMemberWatch
                            ? t.memberIncluded
                            : t.accessNote
                        : isMember && accessType === "ppv_only"
                          ? t.premiumNote
                          : t.membershipNote}
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {!user ? (
                        <Link
                          to="/auth"
                          className="inline-flex items-center justify-center rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream-bright"
                        >
                          {accessType === "ppv_only" ? t.signinToBuy : t.signinToWatch}
                        </Link>
                      ) : showWatchNow ? (
                        <Link
                          to="/watch/$slug"
                          params={{ slug: film.slug }}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream-bright"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          {t.watch}
                        </Link>
                      ) : isMember ? (
                        // Member viewing a ppv_only premium film
                        <button
                          type="button"
                          onClick={() => setCheckoutOpen(true)}
                          disabled={tomanOnly}
                          className="inline-flex items-center justify-center rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream-bright disabled:opacity-60"
                        >
                          {t.buy} — {priceLabel}
                        </button>
                      ) : (
                        // Non-member, film offers membership
                        <>
                          {accessType !== "ppv_only" && (
                            <button
                              type="button"
                              onClick={() => setMembershipOpen(true)}
                              className="inline-flex items-center justify-center rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream-bright"
                            >
                              {primaryLabel}
                            </button>
                          )}
                          {hasPpv && (
                            <button
                              type="button"
                              onClick={() => setCheckoutOpen(true)}
                              disabled={tomanOnly}
                              className="inline-flex items-center justify-center rounded-full border border-cream/25 px-5 py-3 text-sm font-medium text-cream hover:bg-cream/5 transition-colors disabled:opacity-60"
                            >
                              {accessType === "ppv_only" ? `${t.buy} — ${priceLabel}` : `${t.orBuy} — ${priceLabel}`}
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            window.location.href = "/auth";
                            return;
                          }
                          setContribOpen(true);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-cream/15 px-5 py-2.5 text-[12px] font-medium text-cream/75 hover:bg-cream/5 transition-colors"
                      >
                        {t.contribute}
                      </button>
                    </div>
                    {activeTicket?.expires_at && (
                      <p className="mt-4 text-[11px] text-cream/55">
                        {new Date(activeTicket.expires_at).toLocaleString(fa ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    {tomanOnly && <p className="mt-3 text-[11px] text-cream/40">{t.tomanSoon}</p>}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Synopsis + Credits */}
      <section className="mx-auto max-w-6xl px-6 pb-20 grid gap-12 md:grid-cols-[2fr_1fr]">
        {synopsis && (
          <div>
            <h2 className={`text-[10px] uppercase tracking-[0.25em] text-cream/45 ${fa ? "font-vazir" : ""}`}>
              {t.about}
            </h2>
            <p className={`mt-4 whitespace-pre-line text-cream/85 leading-relaxed text-[15px] md:text-base ${fa ? "font-vazir" : ""}`}>
              {synopsis}
            </p>
          </div>
        )}

        {groupedCredits.length > 0 && (
          <aside className="md:border-s md:border-cream/10 md:ps-10">
            <h2 className={`text-[10px] uppercase tracking-[0.25em] text-cream/45 ${fa ? "font-vazir" : ""}`}>
              {t.crew}
            </h2>
            <div className="mt-4 space-y-6">
              {groupedCredits.map(([type, items]) => (
                <div key={type}>
                  <div className="text-[11px] uppercase tracking-widest text-cream/55">
                    {t.creditGroups[type] || type}
                  </div>
                  <dl className="mt-2 space-y-1.5">
                    {items.map((c, i) => (
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
                </div>
              ))}
            </div>
          </aside>
        )}
      </section>

      {/* More films */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex items-baseline justify-between">
            <h2 className={`text-[10px] uppercase tracking-[0.25em] text-cream/45 ${fa ? "font-vazir" : ""}`}>
              {t.moreFromCat}
            </h2>
            <Link to="/browse" className="text-xs uppercase tracking-widest text-cream/55 hover:text-cream-bright">
              {fa ? "همه" : "Browse all"} →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map((r) => {
              const rTitle = fa ? r.title_fa || r.title_en : r.title_en;
              const rDirector = fa ? r.director_fa || r.director_en : r.director_en;
              const bg = r.cover_url
                ? { background: `center / cover no-repeat url(${r.cover_url})` }
                : { background: (r.poster_gradient as string) || fallbackGradient };
              return (
                <Link
                  key={r.id}
                  to="/films/$slug"
                  params={{ slug: r.slug }}
                  className="group block"
                >
                  <div
                    className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-cream/10 transition-transform group-hover:-translate-y-0.5 group-hover:border-cream/25"
                    style={bg}
                  />
                  <div className={`mt-2 text-sm text-cream/90 truncate ${fa ? "font-vazir" : ""}`}>{rTitle}</div>
                  {rDirector && (
                    <div className="text-[11px] text-cream/50 truncate">{rDirector}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {checkoutOpen && (
        <FilmCheckout
          filmSlug={film.slug}
          returnUrl={returnUrl}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {membershipOpen && (
        <MembershipCheckout
          returnUrl={typeof window !== "undefined" ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&membership=1&film=${film.slug}` : ""}
          onClose={() => setMembershipOpen(false)}
        />
      )}

      {contribOpen && (
        <ContributeModal
          filmSlug={film.slug}
          filmTitle={title}
          returnUrl={typeof window !== "undefined" ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=contribution&film=${film.slug}` : ""}
          onClose={() => setContribOpen(false)}
        />
      )}

      {/* Preview / trailer lightbox */}
      {previewOpen && film.preview_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute top-5 right-5 text-cream/70 hover:text-cream-bright text-2xl leading-none"
            aria-label="Close preview"
          >
            ×
          </button>
          <div
            className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-cream/15 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={film.preview_url}
              controls
              autoPlay
              playsInline
              className="h-full w-full"
            />
          </div>
        </div>
      )}
      <SiteFooter />
    </div>

  );
}
