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



export const Route = createFileRoute("/films/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("films")
      .select("id, slug, title_en, title_fa, synopsis_en, synopsis_fa, director_en, director_fa, category, year, duration_min, price_cents, price_toman, ticket_hours, access_mode, access_type, is_premium, poster_gradient, cover_url, thumbnail_url, preview_url, visibility, sort_order, age_rating, has_4k, has_captions, has_subtitles, created_at, updated_at")
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
  const { locale, region, num, year, dir } = useLocale();
  const fa = locale === "fa";
  const { isMember, isLoading: isAuthLoading, user } = useSubscription();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [contribOpen, setContribOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);


  // Log a "view" event with geo / device / referrer captured server-side
  useEffect(() => {
    let sid = "";
    try {
      sid = localStorage.getItem("ir_sid") || "";
      if (!sid) {
        sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem("ir_sid", sid);
      }
    } catch { /* ignore */ }
    import("@/lib/analytics.functions").then(({ logFilmEvent }) => {
      logFilmEvent({ data: { filmId: film.id, type: "view", sessionId: sid, referrer: document.referrer || null } }).catch(() => {});
    });
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




  const t = {
    buy: fa ? "خرید بلیط" : "Buy ticket",
    watch: fa ? "تماشای فیلم" : "Watch now",
    startTrial: fa ? "شروع رایگان ۷ روزه" : "Accept Free Trial",
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

  const heroArt = film.thumbnail_url || film.cover_url;
  const posterStyle = heroArt
    ? { background: `center / cover no-repeat url(${heroArt})` }
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

  // Hero description — let CSS line-clamp handle truncation so the
  // full synopsis is no longer duplicated below the hero.
  const heroSynopsis = synopsis ? synopsis.replace(/\s+/g, " ").trim() : null;

  // Pull a "cast" + "crew" view out of grouped credits for the
  // dedicated Cast & Crew row beneath the hero.
  const castCredits = useMemo(
    () => credits.filter((c) => (c.credit_type || "other") === "cast"),
    [credits],
  );
  const crewCredits = useMemo(
    () => credits.filter((c) => (c.credit_type || "other") !== "cast"),
    [credits],
  );



  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <SiteHeader />

      {/* Cinematic full-bleed hero */}
      <section className="relative isolate min-h-[88vh] w-full overflow-hidden">
        {/* Backdrop — full bleed cover art */}
        <div className="absolute inset-0 -z-30" style={posterStyle} aria-hidden />
        {/* Stronger base darken so any baked-in title artwork in the cover image recedes */}
        <div className="absolute inset-0 -z-20 bg-black/45" aria-hidden />
        {/* Top darkener — hides cover-image artwork from competing with the fixed header */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.55) 55%, rgba(8,8,10,0) 100%)",
          }}
        />
        {/* Cinematic gradients — bottom-to-top + side fade for readability */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,10,0.35) 0%, rgba(8,8,10,0) 30%, rgba(8,8,10,0) 50%, rgba(8,8,10,0.8) 82%, var(--background) 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              dir === "rtl"
                ? "linear-gradient(270deg, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.5) 45%, rgba(8,8,10,0.1) 80%)"
                : "linear-gradient(90deg, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.5) 45%, rgba(8,8,10,0.1) 80%)",
          }}
        />

        {/* Hero content — anchored bottom-start. Top padding clears the fixed header. */}
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-36 md:px-10 md:pb-20 md:pt-44">
          <Link
            to="/"
            className="absolute inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream/70 transition-colors hover:text-cream-bright top-[92px] md:top-[104px]"
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

            {/* Meta row + quality badges */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-cream/75">
              {film.year && <span>{year(film.year)}</span>}
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
              {(film.age_rating || film.has_4k || film.has_captions || film.has_subtitles) && (
                <span className="ms-1 inline-flex items-center gap-1.5">
                  {film.age_rating && (
                    <span className="rounded-[4px] border border-cream/25 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cream-bright">
                      {film.age_rating}
                    </span>
                  )}
                  {film.has_4k && (
                    <span className="rounded-[4px] border border-cream/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-cream-bright">
                      4K
                    </span>
                  )}
                  {film.has_captions && (
                    <span className="rounded-[4px] border border-cream/25 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cream-bright">
                      CC
                    </span>
                  )}
                  {film.has_subtitles && (
                    <span className="rounded-[4px] border border-cream/25 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cream-bright">
                      SUB
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Short synopsis with expandable "More" */}
            {heroSynopsis && (
              <div className="mt-5 max-w-xl">
                <p
                  className={`text-[15px] leading-relaxed text-cream/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-base ${synopsisOpen ? "" : "line-clamp-3"} ${fa ? "font-vazir" : ""}`}
                >
                  {heroSynopsis}
                </p>
                {heroSynopsis.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setSynopsisOpen((v) => !v)}
                    className="mt-2 text-[12px] uppercase tracking-[0.2em] text-cream/65 transition-colors hover:text-cream-bright"
                  >
                    {synopsisOpen ? (fa ? "کمتر" : "Less") : (fa ? "بیشتر" : "More")}
                  </button>
                )}
              </div>
            )}


            {/* CTAs — integrated, not boxed */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthLoading ? (
                <span
                  aria-hidden
                  className="inline-block h-[44px] w-[180px] rounded-full bg-cream/10 animate-pulse"
                />
              ) : !user ? (

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

      {/* More Like This — horizontal poster row, Apple TV style */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-12 pb-8 md:px-10 md:pt-14">
          <div className="mb-5 flex items-end justify-between gap-6">
            <h2 className={`font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
              {fa ? "آثار مرتبط" : "More Like This"}
            </h2>
            <Link to="/browse" className="text-[11px] uppercase tracking-[0.22em] text-cream/50 hover:text-cream-bright transition-colors">
              {fa ? "همه آثار" : "Browse all"} →
            </Link>
          </div>

          {/* Horizontal scrolling row of posters */}
          <div className="-mx-6 overflow-x-auto px-6 pb-3 md:-mx-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-4 min-w-max md:gap-5">
              {related.map((r) => {
                const rTitle = fa ? r.title_fa || r.title_en : r.title_en;
                const rDirector = fa ? r.director_fa || r.director_en : r.director_en;
                const bg = r.cover_url
                  ? { background: `center / cover no-repeat url(${r.cover_url})` }
                  : { background: (r.poster_gradient as string) || fallbackGradient };
                return (
                  <li key={r.id} className="w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
                    <Link
                      to="/films/$slug"
                      params={{ slug: r.slug }}
                      className="group block"
                    >
                      <div className="relative overflow-hidden rounded-xl ring-1 ring-cream/[0.06] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:ring-cream/25 group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
                        <div className="aspect-[2/3] w-full" style={bg} />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-cream-bright px-3 py-1 text-[10px] font-semibold text-ink">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                            {fa ? "تماشا" : "Watch"}
                          </div>
                        </div>
                      </div>
                      <div className={`mt-3 font-display text-[13px] font-medium tracking-[-0.01em] text-cream-bright truncate ${fa ? "font-vazir" : ""}`}>{rTitle}</div>
                      {rDirector && (
                        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cream/40 truncate">{rDirector}</div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Cast & Crew — Apple TV style circular avatars */}
      {(castCredits.length > 0 || crewCredits.length > 0) && (
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10">
          <h2 className={`mb-5 font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
            {fa ? "بازیگران و عوامل" : "Cast & Crew"}
          </h2>

          {castCredits.length > 0 && (
            <div className="-mx-6 overflow-x-auto px-6 pb-2 md:-mx-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="flex gap-5 min-w-max md:gap-7">
                {castCredits.map((c, i) => {
                  const name = fa ? c.value_fa || c.value_en : c.value_en;
                  const role = fa ? c.label_fa || c.label_en : c.label_en;
                  const initial = (name || "?").trim().charAt(0).toUpperCase();
                  return (
                    <li key={`cast-${i}`} className="flex w-24 flex-col items-center text-center shrink-0">
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cream/[0.10] to-cream/[0.02] ring-1 ring-cream/15 text-xl font-display text-cream/85 transition-transform hover:scale-105"
                        aria-hidden
                      >
                        {initial}
                      </div>
                      <div className={`mt-3 text-[12px] font-medium text-cream-bright leading-tight line-clamp-2 ${fa ? "font-vazir" : ""}`}>
                        {name}
                      </div>
                      {role && (
                        <div className="mt-0.5 text-[10px] text-cream/50 leading-tight line-clamp-1">
                          {role}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {crewCredits.length > 0 && (
            <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-2 border-t border-cream/10 pt-5 sm:grid-cols-2 md:grid-cols-3">
              {crewCredits.map((c, i) => (
                <div key={`crew-${i}`} className="flex items-baseline justify-between gap-4 border-b border-cream/[0.06] pb-2">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-cream/45">
                    {fa ? c.label_fa || c.label_en : c.label_en}
                  </dt>
                  <dd className={`text-[13px] text-cream-bright text-right ${fa ? "font-vazir" : ""}`}>
                    {fa ? c.value_fa || c.value_en : c.value_en}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {/* Film Details */}
      <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10">
        <h2 className={`mb-5 font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
          {fa ? "اطلاعات فیلم" : "Film Details"}
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 md:grid-cols-4">
          {film.year && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "سال" : "Year"}</dt>
              <dd className="mt-1 text-[14px] text-cream-bright">{year(film.year)}</dd>
            </div>
          )}
          {film.duration_min && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "مدت" : "Runtime"}</dt>
              <dd className="mt-1 text-[14px] text-cream-bright">{num(film.duration_min)} {fa ? "دقیقه" : "min"}</dd>
            </div>
          )}
          {film.category && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "ژانر" : "Genre"}</dt>
              <dd className={`mt-1 text-[14px] text-cream-bright ${fa ? "font-vazir" : ""}`}>{film.category}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "کشور" : "Country"}</dt>
            <dd className={`mt-1 text-[14px] text-cream-bright ${fa ? "font-vazir" : ""}`}>{fa ? "ایران" : "Iran"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "زبان" : "Language"}</dt>
            <dd className={`mt-1 text-[14px] text-cream-bright ${fa ? "font-vazir" : ""}`}>{fa ? "فارسی" : "Persian (Farsi)"}</dd>
          </div>
          {film.has_subtitles && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "زیرنویس" : "Subtitles"}</dt>
              <dd className="mt-1 text-[14px] text-cream-bright">{fa ? "انگلیسی" : "English"}</dd>
            </div>
          )}
          {film.age_rating && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "رده‌بندی" : "Rating"}</dt>
              <dd className="mt-1 text-[14px] text-cream-bright">{film.age_rating}</dd>
            </div>
          )}
          {(film.has_4k || film.has_captions) && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-cream/45">{fa ? "کیفیت" : "Quality"}</dt>
              <dd className="mt-1 text-[14px] text-cream-bright">
                {[film.has_4k && "4K", film.has_captions && "CC"].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* How to Watch — shown for non-members */}
      {!isMember && (
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10">
          <h2 className={`mb-5 font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
            {fa ? "روش تماشا" : "How to Watch"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Membership / Trial card */}
            <div className="hairline relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber/10 via-bg-1/40 to-bg-1/40 p-6">
              <span className="block text-[10px] uppercase tracking-[0.28em] text-amber">
                {fa ? "عضویت ایران" : "IRAN Membership"}
              </span>
              <h3 className={`mt-2 text-lg text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {fa ? "۷ روز رایگان امتحان کنید" : "Start with 7 days free"}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/65">
                {fa
                  ? "تماشای نامحدود کل کاتالوگ. هر زمان لغو کنید."
                  : "Unlimited access to the full catalog. Cancel anytime."}
              </p>
              <button
                type="button"
                onClick={() => user ? setMembershipOpen(true) : (window.location.href = "/auth")}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-cream-bright px-5 py-2.5 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.02]"
              >
                {t.startTrial}
              </button>
            </div>

            {/* PPV card if available */}
            {hasPpv && (
              <div className="hairline rounded-2xl border bg-bg-1/40 p-6">
                <span className="block text-[10px] uppercase tracking-[0.28em] text-cream/45">
                  {fa ? "خرید این فیلم" : "Rent this film"}
                </span>
                <h3 className={`mt-2 text-lg text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                  {priceLabel}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/65">
                  {t.accessNote}
                </p>
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  disabled={tomanOnly}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-cream/25 px-5 py-2.5 text-[13px] font-medium text-cream-bright transition-colors hover:bg-cream/5 disabled:opacity-60"
                >
                  {t.buy}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Support the filmmaker — compact inline strip */}
      <section className="mx-auto max-w-7xl px-6 pt-6 pb-14 md:px-10">
        <div className="hairline flex flex-col items-start gap-4 rounded-2xl border bg-bg-1/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <span className="block text-[10px] uppercase tracking-[0.28em] text-cream/45">
              {fa ? "حمایت" : "Support"}
            </span>
            <p className={`mt-1.5 text-[14px] text-cream-bright ${fa ? "font-vazir" : ""}`}>
              {fa ? "از فیلم‌ساز حمایت کنید" : "Support the filmmaker"}
              <span className="ms-2 text-cream/55 font-normal">
                {fa ? "— کمک شما مستقیماً به سینمای مستقل ایران می‌رسد." : "— your contribution goes directly to independent Iranian cinema."}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                window.location.href = "/auth";
                return;
              }
              setContribOpen(true);
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-cream/20 px-5 py-2.5 text-[13px] font-medium text-cream/85 transition-colors hover:bg-cream/5 hover:text-cream-bright"
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
