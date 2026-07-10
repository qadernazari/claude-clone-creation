import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WatchlistButton } from "@/components/watchlist-button";
import { MountWhenNear } from "@/components/mount-when-near";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

// Deferred — reviews + episodes only load after the user scrolls or interacts.
const FilmReviewsSection = lazy(() =>
  import("@/components/film-reviews-section").then((m) => ({ default: m.FilmReviewsSection })),
);
const SeriesEpisodes = lazy(() =>
  import("@/components/series-episodes").then((m) => ({ default: m.SeriesEpisodes })),
);
import { useSubscription, memberCanAccess, ppvAvailable } from "@/hooks/use-subscription";
import { useServerFn } from "@tanstack/react-start";
import { getResumePosition } from "@/lib/library.functions";
import { relatedFilmsQueryOptions } from "@/lib/related-films.functions";

// Lazy-loaded — Stripe SDK is ~200KB; only load when user opens checkout.
const FilmCheckout = lazy(() => import("@/components/film-checkout").then((m) => ({ default: m.FilmCheckout })));
// Membership purchases happen on the dedicated /membership page.



export const Route = createFileRoute("/films/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("films")
      .select("id, slug, title_en, title_fa, synopsis_en, synopsis_fa, director_en, director_fa, category, year, duration_min, price_cents, price_toman, ticket_hours, access_mode, access_type, is_premium, poster_gradient, cover_url, thumbnail_url, mobile_cover_url, cover_fit, cover_position, preview_url, visibility, sort_order, age_rating, has_4k, has_captions, has_subtitles, film_type, parent_film_id, season_number, episode_number, created_at, updated_at")
      .eq("slug", params.slug)
      .eq("visibility", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw notFound();
    // Resize the hero image for the og:image / twitter:image tag —
    // matches the homepage pattern (width 1200, quality 75). Crawlers
    // get a fast, uniformly sized share preview instead of the raw
    // full-resolution signed URL.
    const { getResizedOgImage } = await import("@/lib/og-image.functions");
    const ogImage = await getResizedOgImage({
      data: { url: data.thumbnail_url || data.cover_url || null },
    });

    // Hero images: serve the raw signed URL directly (no transform).
    // The Supabase render endpoint re-encodes as WebP, which double-
    // compresses already-optimized uploads and softens small sources
    // (it caps at source width, so requesting 1920 on a 1600px master
    // just re-encodes at lower effective quality). Passing the raw
    // /object/sign URL preserves the original bytes at full quality.
    const heroDesktop = data.thumbnail_url || data.cover_url;
    const heroMobile = data.mobile_cover_url || data.cover_url;

    return { film: data, ogImage, heroDesktop, heroMobile };
  },
  head: ({ params, loaderData }) => {
    const f = loaderData?.film;
    if (!f) return {};
    const title = `${f.title_en} — IRAN`;
    const desc = f.synopsis_en?.slice(0, 160) ?? "Original Iranian short film on IRAN.";
    const url = `https://ir.show/films/${params.slug}`;
    const isoDuration = f.duration_min ? `PT${f.duration_min}M` : undefined;
    const ogImage = loaderData?.ogImage || f.thumbnail_url || f.cover_url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "IRAN" },
        ...(ogImage ? [{ property: "og:image" as const, content: ogImage }] : []),
        ...(ogImage ? [{ name: "twitter:image" as const, content: ogImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: url },
        ...(f.thumbnail_url || f.cover_url
          ? [{ rel: "preload" as const, as: "image" as const, href: (f.thumbnail_url || f.cover_url) as string, fetchpriority: "high" as const }]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name: f.title_en,
            ...(f.title_fa ? { alternateName: f.title_fa } : {}),
            ...(f.director_en && f.category !== "walking-tour" ? { director: { "@type": "Person", name: f.director_en } } : {}),
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
  category?: string | null;
};

const fallbackGradient = "linear-gradient(135deg, oklch(0.25 0.05 270), oklch(0.18 0.03 240))";

function PosterRail({
  heading,
  linkText,
  films,
  fa,
}: {
  heading: string;
  linkText?: string;
  films: RelatedFilm[];
  fa: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10 [content-visibility:auto] [contain-intrinsic-size:1px_500px]">
      <div className="mb-5 flex items-end justify-between gap-6">
        <h2 className={`font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
          {heading}
        </h2>
        {linkText && (
          <Link to="/browse" className="text-[11px] uppercase tracking-[0.22em] text-cream/50 hover:text-cream-bright transition-colors">
            {linkText} →
          </Link>
        )}
      </div>


      <div className="-mx-6 overflow-x-auto overflow-y-visible px-6 pt-2 pb-3 md:-mx-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-4 min-w-max md:gap-5">
          {films.map((r) => {
            const rTitle = fa ? r.title_fa || r.title_en : r.title_en;
            const rDirector = r.category === "walking-tour" ? null : (fa ? r.director_fa || r.director_en : r.director_en);
            const bg = (r.poster_gradient as string) || fallbackGradient;
            return (
              <li key={r.id} className="w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
                <Link to="/films/$slug" params={{ slug: r.slug }} preload="intent" className="group block">
                  <div className="relative overflow-hidden rounded-xl ring-1 ring-cream/6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-[320ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] md:group-hover:-translate-y-1.5 md:group-hover:ring-cream/25 md:group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
                    <div className="aspect-[2/3] w-full" style={{ background: bg }}>
                      {r.cover_url && (
                        <img
                          src={r.cover_url}
                          alt=""
                          width={380}
                          height={570}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          className="h-full w-full object-cover"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-cream-bright px-3 py-1 text-[10px] font-semibold text-ink">
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
  );
}

function FilmPage() {
  const { film, heroDesktop, heroMobile } = Route.useLoaderData();
  const { locale, region, num, year, dir } = useLocale();
  const fa = locale === "fa";
  const { isMember, isLoading: isAuthLoading, user, hasUsedTrial } = useSubscription();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [stickyHeader, setStickyHeader] = useState(false);
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const [inPageCtaVisible, setInPageCtaVisible] = useState(true);

  // Reveal a condensed cinematic header once the hero has scrolled out
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      // ~88vh hero on desktop, ~78vh on mobile — trigger near the end
      const trigger = window.innerHeight * 0.72;
      setStickyHeader(window.scrollY > trigger);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track whether the in-page hero CTA is on screen so the mobile sticky
  // bottom bar only appears once the user has scrolled past it (avoids
  // showing two identical "Sign in to watch" buttons simultaneously).
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInPageCtaVisible(entry.isIntersecting),
      { rootMargin: "-20px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Trap body scroll + ESC-to-close while the trailer modal is open
  useEffect(() => {
    if (!previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);


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
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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



  const { data: related = [] } = useQuery(
    relatedFilmsQueryOptions(film.id, film.category ?? null),
  );

  const { data: categoryName } = useQuery({
    queryKey: ["category-name", film.category],
    enabled: !!film.category,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name_en, name_fa")
        .eq("id", film.category!)
        .maybeSingle();
      return data as { name_en: string; name_fa: string | null } | null;
    },
  });

  const relatedTop = useMemo(() => related.slice(0, 6), [related]);
  const moreFromCollection = useMemo(() => related.slice(6), [related]);

  const title = fa ? film.title_fa || film.title_en : film.title_en;
  const isWalkingTour = film.category === "walking-tour";
  const director = isWalkingTour ? null : (fa ? film.director_fa || film.director_en : film.director_en);
  const synopsis = fa ? film.synopsis_fa || film.synopsis_en : film.synopsis_en;

  const priceLabel =
    region === "iran" && film.price_toman > 0
      ? num(film.price_toman)
      : `$${(film.price_cents / 100).toFixed(2)}`;




  const t = {
    buy: fa ? "خرید بلیط" : "Buy ticket",
    watch: fa ? "تماشای فیلم" : "Watch now",
    startTrial: fa ? "شروع رایگان ۹۰ روزه" : "Accept Free Trial",
    becomeMember: fa ? "عضو شوید" : "Become a Member",
    contribute: fa ? "حمایت می‌کنم" : "Contribute",
    signinToBuy: fa ? "ورود برای خرید بلیط" : "Sign in to buy a ticket",
    signinToWatch: fa ? "برای تماشا وارد شوید" : "Sign in to watch",
    accessNote: fa
      ? "مالکیت دائمی — همیشه در حساب شما"
      : "Yours forever — saved to your account",
    membershipNote: fa
      ? "۹۰ روز رایگان تماشا کنید — سپس از ماهی ۷٫۹۹ دلار"
      : "Stream free for 90 days — then from $7.99/month",
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
    share: fa ? "اشتراک‌گذاری" : "Share",
    copied: fa ? "لینک کپی شد!" : "Link copied!",
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

  // Desktop hero uses the 16:9 landscape art; mobile uses the dedicated 9:16
  // vertical poster so faces and titles aren't cropped. Falls back gracefully.
  const heroArtDesktop = film.thumbnail_url || film.cover_url;
  const heroArtMobile = film.mobile_cover_url || film.cover_url || film.thumbnail_url;
  const heroArt = heroArtDesktop || heroArtMobile;
  const isContain = (film as { cover_fit?: string | null }).cover_fit === "contain";
  const coverPosition = (film as { cover_position?: string | null }).cover_position || "center";
  const POS_CLASS_MAP: Record<string, string> = {
    // Bias slightly toward the top so tall subjects (domes, skylines) are
    // preserved instead of getting clipped by the wide hero crop.
    center: "object-[center_30%]",
    top: "object-top",
    bottom: "object-bottom",
    left: "object-left",
    right: "object-right",
  };
  const heroFitClass = isContain ? "object-contain object-center" : `object-cover ${POS_CLASS_MAP[coverPosition] || "object-[center_30%]"}`;
  const posterStyle = heroArt
    ? { backgroundImage: `url(${heroArt})` }
    : { background: (film.poster_gradient as string) || fallbackGradient };


  const handleShare = async () => {
    const url = `https://ir.show/films/${film.slug}`;
    const firstSentence = synopsis
      ? (synopsis.replace(/\s+/g, " ").trim().match(/^[^.!?。！？]+[.!?。！？]?/)?.[0] ?? "").trim()
      : "";
    const shareData = { title, text: firstSentence, url };
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
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





  return (
    <main dir={dir} className="min-h-screen overflow-x-hidden bg-background text-foreground pb-20 md:pb-0">

      <div
        className={`transition-opacity duration-300 ${stickyHeader ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-hidden={stickyHeader}
      >
        <SiteHeader />
      </div>

      {/* Condensed sticky cinematic header — appears after the hero scrolls past.
          Mirrors the primary CTA so users on long pages can always Watch/Buy. */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          stickyHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
        aria-hidden={!stickyHeader}
      >
        <div
          className="pointer-events-auto border-b border-cream/8 bg-bg-0/80 backdrop-blur-xl"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 md:px-10">
            <Link
              to="/"
              className="hidden shrink-0 text-cream/55 transition-colors hover:text-cream-bright md:inline-flex"
              aria-label={t.back}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={dir === "rtl" ? { transform: "scaleX(-1)" } : undefined}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1">
              <div className={`truncate font-display text-[15px] font-medium tracking-[-0.01em] text-cream-bright md:text-[16px] ${fa ? "font-vazir" : ""}`}>
                {title}
              </div>
              {director && (
                <div className="truncate text-[11px] text-cream/45">
                  {fa ? "کارگردان " : "Dir. "}{director}
                </div>
              )}
            </div>
            {!isAuthLoading && (
              !user ? (
                <Link
                  to="/auth"
                  search={{ redirect: `/watch/${film.slug}` }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md bg-cream-bright px-4 py-2 text-[12px] font-semibold text-ink transition-transform hover:scale-[1.02]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  <span className="hidden sm:inline">{accessType === "ppv_only" ? t.signinToBuy : t.signinToWatch}</span>
                  <span className="sm:hidden">{fa ? "ورود" : "Sign in"}</span>
                </Link>
              ) : showWatchNow ? (
                <Link
                  to="/watch/$slug"
                  params={{ slug: film.slug }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md bg-cream-bright px-4 py-2 text-[12px] font-semibold text-ink transition-transform hover:scale-[1.02]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  {t.watch}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isMember || accessType === "ppv_only") setCheckoutOpen(true);
                    else window.location.href = "/membership";
                  }}
                  disabled={tomanOnly && (isMember || accessType === "ppv_only")}
                  className="inline-flex shrink-0 items-center rounded-md bg-cream-bright px-4 py-2 text-[12px] font-semibold text-ink transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {isMember || accessType === "ppv_only" ? `${t.buy} — ${priceLabel}` : t.becomeMember}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Cinematic full-bleed hero */}
      <section className="relative isolate min-h-[78vh] w-full overflow-hidden bg-background md:min-h-[88vh]">
        {/* Backdrop — isolated full-bleed art, nudged down without adding a top bar */}
        {heroArt ? (
          <>
            {/* Blurred backdrop when contain, so no black bars */}
            {isContain ? (
              <img
                src={heroDesktop || heroArtDesktop || heroMobile || heroArtMobile || ""}
                alt=""
                aria-hidden
                className="absolute inset-0 -z-40 h-full w-full object-cover blur-2xl scale-110 opacity-40 select-none"
              />
            ) : null}
            {/* Mobile: 9:16 vertical poster */}
            {heroArtMobile ? (
              <img
                src={heroMobile || heroArtMobile}
                alt=""
                decoding="async"
                className={`film-hero-kenburns absolute inset-0 -z-30 h-full w-full ${heroFitClass} select-none md:hidden`}
                aria-hidden
              />
            ) : null}
            {/* Desktop / tablet: 16:9 cinematic art with slow Ken Burns drift. */}
            {heroArtDesktop ? (
              <img
                src={heroDesktop || heroArtDesktop}
                alt=""
                decoding="async"
                className={`film-hero-kenburns absolute ${isContain ? "inset-0 h-full" : "inset-x-0 -top-[10%] h-[112%] translate-y-[7%]"} -z-30 hidden w-full max-w-none ${heroFitClass} select-none md:block`}
                aria-hidden
              />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 -z-30" style={posterStyle} aria-hidden />
        )}
        {/* Very light base tint — keep the image bright and cinematic */}
        <div
          className="absolute inset-0 -z-20 bg-black/10"
          aria-hidden
        />
        {/* Bottom fade for text readability + blend into page background */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0) 55%, rgba(8,8,10,0.65) 85%, var(--background) 100%)",
          }}
        />
        {/* Side fade behind the title column only */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              dir === "rtl"
                ? "linear-gradient(270deg, rgba(8,8,10,0.58) 0%, rgba(8,8,10,0.16) 45%, rgba(8,8,10,0) 75%)"
                : "linear-gradient(90deg, rgba(8,8,10,0.58) 0%, rgba(8,8,10,0.16) 45%, rgba(8,8,10,0) 75%)",
          }}
        />


        {/* Hero content — anchored bottom-start. Top padding clears the fixed header. */}
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-5 pb-10 pt-24 sm:px-6 md:min-h-[88vh] md:px-10 md:pb-20 md:pt-44">
          <Link
            to="/"
            className="absolute hidden md:inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream/70 transition-colors hover:text-cream-bright top-[104px]"
            style={dir === "rtl" ? { right: "1.5rem" } : { left: "1.5rem" }}
          >
            ← {t.back}
          </Link>


          <div className="max-w-2xl">
            {film.category && (
              <span className="inline-flex rounded-md bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cream/80 backdrop-blur-sm ring-1 ring-cream/10">
                {fa
                  ? (categoryName?.name_fa || categoryName?.name_en || film.category)
                  : (categoryName?.name_en || (film.category.charAt(0).toUpperCase() + film.category.slice(1)))}
              </span>
            )}

            <h1
              className={`mt-5 break-words text-4xl font-medium leading-[0.98] tracking-[-0.045em] text-cream-bright drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-5xl md:text-7xl ${fa ? "font-vazir" : "font-display"}`}
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

            {/* Synopsis — only truncate when genuinely long */}
            {heroSynopsis && (() => {
              const isLong = heroSynopsis.length > 400;
              const clamp = isLong && !synopsisOpen;
              return (
                <div className="mt-5 max-w-xl">
                  <p
                    className={`text-[15px] leading-relaxed text-cream/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-base ${clamp ? "line-clamp-3" : ""} ${fa ? "font-vazir" : ""}`}
                  >
                    {heroSynopsis}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setSynopsisOpen((v) => !v)}
                      className="mt-2 text-[12px] uppercase tracking-[0.2em] text-cream/65 transition-colors hover:text-cream-bright"
                    >
                      {synopsisOpen ? (fa ? "کمتر" : "Less") : (fa ? "بیشتر" : "More")}
                    </button>
                  )}
                </div>
              );
            })()}


            {/* CTAs — integrated, not boxed */}
            <div ref={heroCtaRef} className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthLoading ? (
                <span
                  aria-busy="true"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-cream-bright/90 px-6 py-3 text-sm font-semibold text-ink/70 shadow-lg shadow-black/30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.watch}
                </span>
              ) : !user ? (

                <Link
                  to="/auth"
                  search={{ redirect: `/watch/${film.slug}` }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber px-7 py-3 text-[14px] font-bold uppercase tracking-[0.06em] text-ink shadow-[0_10px_30px_-8px_rgba(201,168,76,0.55)] transition-all hover:bg-amber/90 hover:scale-[1.02]"
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber px-7 py-3 text-[14px] font-bold uppercase tracking-[0.06em] text-ink shadow-[0_10px_30px_-8px_rgba(201,168,76,0.55)] transition-all hover:bg-amber/90 hover:scale-[1.02]"
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
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber px-7 py-3 text-[14px] font-bold uppercase tracking-[0.06em] text-ink shadow-[0_10px_30px_-8px_rgba(201,168,76,0.55)] transition-all hover:bg-amber/90 hover:scale-[1.02] disabled:opacity-60"
                >
                  {t.buy} — {priceLabel}
                </button>
              ) : accessType === "ppv_only" ? (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  disabled={tomanOnly}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber px-7 py-3 text-[14px] font-bold uppercase tracking-[0.06em] text-ink shadow-[0_10px_30px_-8px_rgba(201,168,76,0.55)] transition-all hover:bg-amber/90 hover:scale-[1.02] disabled:opacity-60"
                >
                  {t.buy} — {priceLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/membership")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber px-7 py-3 text-[14px] font-bold uppercase tracking-[0.06em] text-ink shadow-[0_10px_30px_-8px_rgba(201,168,76,0.55)] transition-all hover:bg-amber/90 hover:scale-[1.02]"
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
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-cream/25 bg-black/20 px-3.5 text-[12px] font-medium text-cream/85 backdrop-blur-sm transition-colors hover:border-cream/45 hover:bg-cream/8 hover:text-cream"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cream/20 bg-black/20 text-cream/85 backdrop-blur-sm transition-colors hover:border-cream/45 hover:bg-cream/8 hover:text-cream-bright"
                aria-label={t.share}
                title={copied ? t.copied : t.share}
              >
                {copied ? (
                  <Check size={16} className="text-amber" aria-hidden />
                ) : (
                  <Share2 size={16} aria-hidden />
                )}
              </button>
            </div>

            {/* Subtle access note — no boxed pricing */}
            <p className="mt-5 text-[12px] tracking-wide text-cream/50">
              {accessNote}
              {activeTicket?.expires_at && (
                <span className="ms-2 text-cream/35">
                  · {new Date(activeTicket.expires_at).toLocaleString(fa ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </p>
            {tomanOnly && <p className="mt-1.5 text-[11px] text-cream/40">{t.tomanSoon}</p>}
          </div>
        </div>
      </section>

      {/* Film Details */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-8 md:px-10 md:pt-14 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
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
              <dd className={`mt-1 text-[14px] text-cream-bright ${fa ? "font-vazir" : ""}`}>{fa ? (categoryName?.name_fa || categoryName?.name_en || film.category) : (categoryName?.name_en || (film.category.charAt(0).toUpperCase() + film.category.slice(1)))}</dd>
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

      {/* Related — horizontal poster row, Apple TV style */}
      {relatedTop.length > 0 && (
        <PosterRail
          heading={fa ? "آثار مرتبط" : "Related"}
          linkText={fa ? "همه آثار" : "Browse all"}
          films={relatedTop}
          fa={fa}
        />
      )}

      {/* Cast & Crew — circular avatars for every credit */}
      {credits.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10 [content-visibility:auto] [contain-intrinsic-size:1px_300px]">
          <h2 className={`mb-5 font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[24px] ${fa ? "font-vazir" : ""}`}>
            {fa ? "بازیگران و عوامل" : "Cast & Crew"}
          </h2>


          <div className="-mx-6 overflow-x-auto overflow-y-visible px-6 pt-2 pb-3 md:-mx-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-5 min-w-max md:gap-7">
              {credits.map((c, i) => {
                const name = (fa ? c.value_fa || c.value_en : c.value_en) || "";
                const creditTypeLabels: Record<string, { en: string; fa: string }> = {
                  director: { en: "Director", fa: "کارگردان" },
                  writer: { en: "Writer", fa: "نویسنده" },
                  producer: { en: "Producer", fa: "تهیه‌کننده" },
                  composer: { en: "Composer", fa: "آهنگساز" },
                  cinematographer: { en: "Cinematographer", fa: "فیلم‌بردار" },
                  editor: { en: "Editor", fa: "تدوین‌گر" },
                  cast: { en: "Cast", fa: "بازیگر" },
                  actor: { en: "Actor", fa: "بازیگر" },
                  narrator: { en: "Narrator", fa: "راوی" },
                  sound: { en: "Sound", fa: "صدا" },
                  production: { en: "Production", fa: "تولید" },
                };
                const fallback = c.credit_type
                  ? creditTypeLabels[c.credit_type.toLowerCase()] ?? {
                      en: c.credit_type.charAt(0).toUpperCase() + c.credit_type.slice(1),
                      fa: c.credit_type,
                    }
                  : null;
                const role = fa
                  ? c.label_fa || c.label_en || fallback?.fa
                  : c.label_en || fallback?.en;
                const parts = name.trim().split(/\s+/).filter(Boolean);
                const initials = ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
                return (
                  <li key={`cred-${i}`} className="flex w-24 flex-col items-center text-center shrink-0">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cream/15 to-cream/[0.03] ring-1 ring-cream/15 text-[15px] font-medium tracking-wider text-cream/85 transition-transform hover:scale-105"
                      aria-hidden
                    >
                      {initials}
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
        </section>
      )}

      {/* More From This Collection */}
      {moreFromCollection.length > 0 && (
        <PosterRail
          heading={
            categoryName
              ? fa
                ? `بیشتر از ${categoryName.name_fa || categoryName.name_en}`
                : `More from ${categoryName.name_en}`
              : fa
                ? "بیشتر از این مجموعه"
                : "More from this collection"
          }
          films={moreFromCollection}
          fa={fa}
        />
      )}


      {/* How to Watch — shown for non-members */}
      {!isMember && (
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-8 md:px-10 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Membership / Trial card */}
            <div className="hairline relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber/10 via-bg-1/40 to-bg-1/40 p-6">
              <span className="block text-[10px] uppercase tracking-[0.28em] text-amber">
                {fa ? "عضویت ایران" : "IRAN Membership"}
              </span>
              <h3 className={`mt-2 text-lg text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {hasUsedTrial
                  ? (fa ? "عضویت خود را فعال کنید" : "Activate your membership")
                  : (fa ? "۹۰ روز رایگان امتحان کنید" : "Start with 90 days free")}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/65">
                {hasUsedTrial
                  ? (fa
                      ? "برای ادامه تماشای نامحدود، عضو شوید."
                      : "Subscribe to keep unlimited access to the full catalog.")
                  : (fa
                      ? "تماشای نامحدود کل کاتالوگ. هر زمان لغو کنید."
                      : "Unlimited access to the full catalog. Cancel anytime.")}
              </p>
              <button
                type="button"
                onClick={() => user ? (window.location.href = "/membership") : (window.location.href = "/auth")}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-cream-bright px-5 py-2.5 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.02]"
              >
                {t.becomeMember}
              </button>
              <p className="mt-2 text-[11px] text-cream/40">
                {fa ? "از ماهی ۷٫۹۹ دلار · بدون تمدید خودکار" : "From $7.99 / month · No auto-renewal"}
              </p>
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
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-cream/25 px-5 py-2.5 text-[13px] font-medium text-cream-bright transition-colors hover:bg-cream/5 disabled:opacity-60"
                >
                  {t.buy}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {checkoutOpen && (
        <Suspense fallback={null}>
          <FilmCheckout
            filmSlug={film.slug}
            filmId={film.id}
            priceToman={film.price_toman || undefined}
            returnUrl={returnUrl}
            onClose={() => setCheckoutOpen(false)}
          />
        </Suspense>
      )}


      {/* Preview / trailer lightbox */}
      {/* Cinema trailer modal — true black, fade-in, ESC + body-scroll-lock above */}
      {previewOpen && film.preview_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 trailer-modal-fade backdrop-blur-md"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.playPreview}
        >
          {/* Eyebrow label, top-left */}
          <div
            className={`pointer-events-none absolute top-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber/90 ${dir === "rtl" ? "right-6" : "left-6"}`}
          >
            {fa ? "تیزر" : "Trailer"}
            <span className={`text-cream/40 ${dir === "rtl" ? "mr-2" : "ml-2"}`}>· {title}</span>
          </div>
          {/* Cinematic close button */}
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className={`absolute top-5 flex h-10 w-10 items-center justify-center rounded-md border border-cream/15 bg-black/40 text-cream/75 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-amber/40 hover:text-amber ${dir === "rtl" ? "left-5" : "right-5"}`}
            aria-label={fa ? "بستن" : "Close"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-cream/10 bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,168,76,0.08)] trailer-modal-rise"
            onClick={(e) => e.stopPropagation()}
            style={{ aspectRatio: "16 / 9" }}
          >
            <video
              src={film.preview_url}
              controls
              autoPlay
              playsInline
              className="h-full w-full"
            />
          </div>
          <p className={`pointer-events-none absolute bottom-5 text-[10px] uppercase tracking-[0.28em] text-cream/35 ${dir === "rtl" ? "right-6" : "left-6"}`}>
            {fa ? "برای بستن کلیک کنید یا ESC را بزنید" : "Click outside or press ESC to close"}
          </p>
        </div>
      )}
      {film.film_type === "series" && (
        <MountWhenNear rootMargin="400px" minHeight={320}>
          <Suspense fallback={null}>
            <SeriesEpisodes seriesId={film.id} />
          </Suspense>
        </MountWhenNear>
      )}
      <MountWhenNear rootMargin="400px" minHeight={280}>
        <Suspense fallback={null}>
          <FilmReviewsSection filmId={film.id} />
        </Suspense>
      </MountWhenNear>
      <SiteFooter />

      {/* Mobile-only sticky bottom CTA — sits above the bottom tab bar.
          Hidden on desktop; mirrors the primary action from the hero so users
          can always tap Watch / Buy / Sign-in without scrolling back up. */}
      <div
        className={`fixed inset-x-0 z-30 md:hidden pointer-events-none transition-all duration-300 ${
          inPageCtaVisible ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
        aria-hidden={inPageCtaVisible}
      >
        <div className="pointer-events-auto mx-3 mb-2 rounded-md border border-cream/10 bg-bg-0/90 px-3 py-2.5 backdrop-blur-xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)]">
          {isAuthLoading ? (
            <div className="h-11 w-full rounded-md bg-cream/10" aria-busy="true" />
          ) : !user ? (
            <Link
              to="/auth"
              search={{ redirect: `/watch/${film.slug}` }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream-bright text-sm font-semibold text-ink active:scale-[0.98] transition-transform"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              {accessType === "ppv_only" ? t.signinToBuy : t.signinToWatch}
            </Link>
          ) : showWatchNow ? (
            <Link
              to="/watch/$slug"
              params={{ slug: film.slug }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream-bright text-sm font-semibold text-ink active:scale-[0.98] transition-transform"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              {resumeSec > 0 ? `${fa ? "ادامه از " : "Continue · "}${fmtResume(resumeSec)}` : t.watch}
            </Link>
          ) : accessType === "ppv_only" || isMember ? (
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              disabled={tomanOnly}
              className="flex h-11 w-full items-center justify-center rounded-md bg-cream-bright text-sm font-semibold text-ink active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {t.buy} — {priceLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (window.location.href = "/membership")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cream-bright text-sm font-semibold text-ink active:scale-[0.98] transition-transform"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              {t.startTrial}
            </button>
          )}
        </div>
      </div>
    </main>

  );
}
