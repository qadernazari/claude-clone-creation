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
import { PromoBannerList } from "@/components/promo-banner";
import { useSubscription, memberCanAccess, ppvAvailable } from "@/hooks/use-subscription";
import { useServerFn } from "@tanstack/react-start";
import { getResumePosition } from "@/lib/library.functions";
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
    const isoDuration = f.duration_min ? `PT${f.duration_min}M` : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "IRAN" },
        ...(f.cover_url ? [{ property: "og:image" as const, content: f.cover_url }] : []),
        ...(f.cover_url ? [{ name: "twitter:image" as const, content: f.cover_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name: f.title_en,
            ...(f.title_fa ? { alternateName: f.title_fa } : {}),
            ...(f.director_en ? { director: { "@type": "Person", name: f.director_en } } : {}),
            ...(f.year ? { datePublished: String(f.year) } : {}),
            ...(f.cover_url ? { image: f.cover_url } : {}),
            ...(f.synopsis_en ? { description: f.synopsis_en } : {}),
            ...(isoDuration ? { duration: isoDuration } : {}),
            inLanguage: "fa",
            countryOfOrigin: { "@type": "Country", name: "Iran" },
            ...(f.category ? { genre: f.category } : {}),
            url,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "IRAN", item: "https://ir.show/" },
              { "@type": "ListItem", position: 2, name: "Browse", item: "https://ir.show/browse" },
              { "@type": "ListItem", position: 3, name: f.title_en, item: url },
            ],
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

  const fetchResume = useServerFn(getResumePosition);
  const { data: resume } = useQuery({
    queryKey: ["resume", film.id, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => fetchResume({ data: { filmId: film.id } }),
    staleTime: 30_000,
  });
  const resumeSec = resume && !resume.completed && resume.positionSeconds > 10 ? resume.positionSeconds : 0;
  const fmtResume = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(Math.floor(r)).padStart(2, "0")}`;
  };



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

  // Compute access state once for the hero CTAs
  const accessType = film.access_type ?? "membership";
  const canMemberWatch = memberCanAccess(accessType);
  const hasPpv = ppvAvailable(accessType);
  const showWatchNow = !!activeTicket || (isMember && canMemberWatch) || accessType === "free";

  const accessNote = showWatchNow
    ? activeTicket
      ? t.ticketActive
      : isMember && canMemberWatch
        ? t.memberIncluded
        : t.accessNote
    : isMember && accessType === "ppv_only"
      ? t.premiumNote
      : t.membershipNote;

  const shortSynopsis = synopsis
    ? synopsis.replace(/\s+/g, " ").trim().slice(0, 220) + (synopsis.length > 220 ? "…" : "")
    : null;

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <SiteHeader />

      {/* Cinematic full-bleed hero */}
      <section className="relative isolate -mt-[72px] min-h-[88vh] w-full overflow-hidden">
        {/* Backdrop — full bleed cover art */}
        <div className="absolute inset-0 -z-30" style={posterStyle} aria-hidden />
        {/* Soft blur edge to hide poster seams on ultra-wide */}
        <div className="absolute inset-0 -z-20 bg-black/10" aria-hidden />
        {/* Cinematic gradients — bottom-to-top + side fade for readability */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,10,0.55) 0%, rgba(8,8,10,0) 28%, rgba(8,8,10,0) 50%, rgba(8,8,10,0.75) 82%, var(--background) 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              dir === "rtl"
                ? "linear-gradient(270deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.35) 45%, rgba(8,8,10,0) 75%)"
                : "linear-gradient(90deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.35) 45%, rgba(8,8,10,0) 75%)",
          }}
        />

        {/* Hero content — anchored bottom-start */}
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-32 md:px-10 md:pb-20 md:pt-40">
          <Link
            to="/"
            className="absolute top-24 inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream/55 transition-colors hover:text-cream-bright md:top-28"
            style={dir === "rtl" ? { right: "1.5rem" } : { left: "1.5rem" }}
          >
            ← {t.back}
          </Link>

          <div className="max-w-2xl">
            {film.category && (
              <span className="inline-flex rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cream/80 backdrop-blur-sm ring-1 ring-cream/10">
                {film.category}
              </span>
            )}

            <h1
              className={`mt-5 text-5xl font-medium leading-[0.98] tracking-[-0.045em] text-cream-bright drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] md:text-7xl ${fa ? "font-vazir" : "font-display"}`}
            >
              {title}
            </h1>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-cream/75">
              {film.year && <span>{num(film.year)}</span>}
              {film.year && film.duration_min ? <span className="text-cream/30">·</span> : null}
              {film.duration_min && (
                <span>
                  {num(film.duration_min)} {fa ? "دقیقه" : "min"}
                </span>
              )}
              {director && (
                <>
                  <span className="text-cream/30">·</span>
                  <span>
                    {fa ? "کارگردان " : "Dir. "}
                    <span className="text-cream-bright">{director}</span>
                  </span>
                </>
              )}
            </div>

            {/* Short synopsis */}
            {shortSynopsis && (
              <p
                className={`mt-5 max-w-xl text-[15px] leading-relaxed text-cream/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-base ${fa ? "font-vazir" : ""}`}
              >
                {shortSynopsis}
              </p>
            )}

            {/* CTAs — integrated, not boxed */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-bright px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 transition-transform hover:scale-[1.02]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {accessType === "ppv_only" ? t.signinToBuy : t.signinToWatch}
                </Link>
              ) : showWatchNow ? (
                <Link
                  to="/watch/$slug"
                  params={{ slug: film.slug }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-bright px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 transition-transform hover:scale-[1.02]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {resumeSec > 0
                    ? `${fa ? "ادامه از " : "Continue · "}${fmtResume(resumeSec)}`
                    : t.watch}
                </Link>
              ) : isMember ? (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  disabled={tomanOnly}
                  className="inline-flex items-center justify-center rounded-full bg-cream-bright px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {t.buy} — {priceLabel}
                </button>
              ) : accessType === "ppv_only" ? (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  disabled={tomanOnly}
                  className="inline-flex items-center justify-center rounded-full bg-cream-bright px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {t.buy} — {priceLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMembershipOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-bright px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 transition-transform hover:scale-[1.02]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.watch}
                </button>
              )}

              <WatchlistButton filmId={film.id} variant="pill" />

              {film.preview_url && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-black/30 px-5 py-3 text-sm font-medium text-cream backdrop-blur-sm transition-colors hover:bg-cream/10"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.playPreview}
                </button>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-full border border-cream/15 bg-black/30 p-3 text-cream/80 backdrop-blur-sm transition-colors hover:bg-cream/10 hover:text-cream-bright"
                aria-label={t.share}
                title={copied ? t.copied : t.share}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>

            {/* Subtle access note — no boxed pricing */}
            <p className="mt-5 text-[12px] tracking-wide text-cream/55">
              {accessNote}
              {activeTicket?.expires_at && (
                <span className="ms-2 text-cream/35">
                  · {new Date(activeTicket.expires_at).toLocaleString(fa ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </p>
            {tomanOnly && <p className="mt-1.5 text-[11px] text-cream/40">{t.tomanSoon}</p>}

            {!showWatchNow && (hasPpv || accessType !== "ppv_only") && (
              <div className="mt-4 max-w-md">
                <PromoBannerList
                  context={isMember || accessType === "ppv_only" ? "ticket" : "membership"}
                  filmId={film.id}
                  fa={fa}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Synopsis + Credits */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-20 md:grid-cols-[2fr_1fr]">
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
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
                {fa ? "بیشتر" : "Continue exploring"}
              </span>
              <h2 className="font-editorial text-3xl italic font-normal text-cream-bright md:text-4xl">
                {t.moreFromCat}
              </h2>
            </div>
            <Link to="/browse" className="text-[11px] uppercase tracking-[0.22em] text-cream/50 hover:text-cream-bright transition-colors">
              {fa ? "همه آثار" : "Browse all"} →
            </Link>
          </div>
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
                    className="aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 ring-cream/[0.06] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover:-translate-y-1 group-hover:ring-cream/20"
                    style={bg}
                  />
                  <div className={`mt-3 font-display text-[13px] font-medium tracking-[-0.01em] text-cream-bright truncate ${fa ? "font-vazir" : ""}`}>{rTitle}</div>
                  {rDirector && (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cream/40 truncate">{rDirector}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Support the filmmaker — subtle, near the bottom */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="hairline rounded-2xl border bg-bg-1/40 px-8 py-8 text-center">
          <span className="block text-[10px] uppercase tracking-[0.28em] text-cream/40">
            {fa ? "حمایت" : "Support"}
          </span>
          <h3 className={`mt-3 text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {fa ? "از فیلم‌ساز حمایت کنید" : "Support the filmmaker"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-cream/60">
            {fa
              ? "کمک‌های شما مستقیماً به ادامه ساخت سینمای مستقل ایران می‌رسد."
              : "Your contribution goes directly to keeping independent Iranian cinema alive."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                window.location.href = "/auth";
                return;
              }
              setContribOpen(true);
            }}
            className="mt-5 inline-flex items-center justify-center rounded-full border border-cream/20 px-5 py-2.5 text-[13px] font-medium text-cream/85 transition-colors hover:bg-cream/5 hover:text-cream-bright"
          >
            {t.contribute}
          </button>
        </div>
      </section>

      {checkoutOpen && (
        <FilmCheckout
          filmSlug={film.slug}
          filmId={film.id}
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
