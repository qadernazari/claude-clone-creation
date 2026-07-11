import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FeaturedFilm } from "../components/featured-film";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { homeFeaturedQueryOptions, homeFeaturedSlidesQueryOptions, homeRailsQueryOptions } from "@/lib/home.functions";

// Below-the-fold rails are lazy-loaded and only mounted when the user
// approaches them. Each rail ships in its own chunk so the initial
// homepage bundle stays lean — New Release and Walking Tour are
// separate chunks that only download when their section mounts.
const NewReleaseRow = lazy(() =>
  import("../components/new-release-row").then((m) => ({ default: m.NewReleaseRow })),
);
const WalkingTourRow = lazy(() =>
  import("../components/walking-tour-row").then((m) => ({ default: m.WalkingTourRow })),
);
const FilmsRow = lazy(() =>
  import("../components/films-row").then((m) => ({ default: m.FilmsRow })),
);
const ContinueWatching = lazy(() =>
  import("../components/continue-watching").then((m) => ({ default: m.ContinueWatching })),
);

// Warm the lazy chunks + rails data on idle so the moment the user scrolls
// the rails render instantly — no chunk fetch, no query wait.
function prefetchRails(queryClient: ReturnType<typeof useQueryClient>) {
  void import("../components/new-release-row");
  void import("../components/walking-tour-row");
  void import("../components/films-row");
  void import("../components/continue-watching");
  void queryClient.prefetchQuery(homeRailsQueryOptions);
}


// Skeleton that mirrors a horizontal rail: heading + row of aspect-ratio
// cards. Heights are derived from card widths so mobile and desktop match
// the eventual rendered content and no reflow occurs when it swaps in.
function RailSkeleton({
  aspect,
  cardWidthMobile,
  cardWidthDesktop,
  headingWidth = "10rem",
}: {
  aspect: "video" | "2/3";
  cardWidthMobile: string;
  cardWidthDesktop: string;
  headingWidth?: string;
}) {
  const aspectClass = aspect === "video" ? "aspect-video" : "aspect-[2/3]";
  return (
    <section className="mx-auto w-full max-w-7xl px-5 sm:px-6 md:px-12" aria-hidden>
      <div
        className="mb-4 h-6 rounded-md bg-cream/8 md:mb-5 md:h-7"
        style={{ width: headingWidth }}
      />
      <div className="flex gap-3 overflow-hidden md:gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="shrink-0" style={{ width: `var(--rail-card-w)` }}>
            <div className={`${aspectClass} w-full rounded-xl bg-cream/6`} />
            <div className="mt-3 h-3.5 w-4/5 rounded bg-cream/8" />
            <div className="mt-2 h-3 w-2/5 rounded bg-cream/6" />
          </div>
        ))}
      </div>
      <style>{`
        :where(section[aria-hidden]) { --rail-card-w: ${cardWidthMobile}; }
        @media (min-width: 768px) {
          :where(section[aria-hidden]) { --rail-card-w: ${cardWidthDesktop}; }
        }
      `}</style>
    </section>
  );
}

function RailsSkeleton() {
  return (
    <div className="space-y-10 pb-16 pt-6 md:space-y-14 md:pb-24 md:pt-10">
      <RailSkeleton aspect="video" cardWidthMobile="78vw" cardWidthDesktop="400px" headingWidth="12rem" />
      <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" />
      <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" />
      <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" />
    </div>
  );
}

function DeferredHomeRails() {
  const [show, setShow] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fire-and-forget: initialize perf logging (opt-in via ?perf=1).
    void import("@/lib/perf-log").then((m) => {
      m.initPerfLogs();
      m.logEvent("DeferredHomeRails:effect");
    });

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const idle = (cb: () => void, timeout: number) => {
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout });
      else setTimeout(cb, Math.min(timeout, 200));
    };
    idle(() => {
      prefetchRails(queryClient);
      void import("@/lib/perf-log").then((m) => m.logEvent("rails:prefetch+show"));
      setShow(true);
    }, 800);
  }, [queryClient]);



  if (!show) {
    return <RailsSkeleton />;
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="pt-6 md:pt-10">
            <RailSkeleton
              aspect="video"
              cardWidthMobile="78vw"
              cardWidthDesktop="400px"
              headingWidth="12rem"
            />
          </div>
        }
      >
        <div className="pt-6 md:pt-10">
          <ContinueWatching />
        </div>
      </Suspense>
      <Suspense
        fallback={
          <div className="pt-6 md:pt-10">
            <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" headingWidth="10rem" />
          </div>
        }
      >
        <div className="pt-6 md:pt-10">
          <NewReleaseRow />
        </div>
      </Suspense>
      <Suspense
        fallback={
          <div className="pt-6 md:pt-10">
            <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" headingWidth="10rem" />
          </div>
        }
      >
        <div className="pt-6 md:pt-10">
          <WalkingTourRow />
        </div>
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-10 pb-16 pt-6 md:space-y-14 md:pb-24 md:pt-10">
            <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" />
            <RailSkeleton aspect="2/3" cardWidthMobile="42vw" cardWidthDesktop="220px" />
          </div>
        }
      >
        <div className="space-y-10 pb-16 pt-6 md:space-y-14 md:pb-24 md:pt-10">
          <FilmsRow />
        </div>
      </Suspense>
    </>
  );
}







function HomePendingShell() {
  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="home" />
      <main className="relative h-[100svh] min-h-[620px] overflow-hidden bg-bg-1 md:h-[100dvh] md:min-h-[640px]">
        <div className="hero-mobile-skeleton absolute inset-0" aria-hidden />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,13,0.18) 0%, rgba(13,13,13,0.38) 58%, var(--bg-0) 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-8 sm:px-6 md:px-12 md:pb-20">
            <div className="hero-pending-copy max-w-2xl" aria-hidden>
              <div className="h-3 w-28 rounded-full bg-amber/35" />
              <div className="mt-5 h-12 w-[min(78vw,24rem)] rounded-md bg-cream/12 md:h-20 md:w-[32rem]" />
              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-2 w-20 rounded-full bg-cream/12" />
                <div className="h-2 w-10 rounded-full bg-cream/10" />
                <div className="h-2 w-12 rounded-full bg-cream/10" />
              </div>
              <div className="mt-7 h-11 w-36 rounded-md bg-cream-bright/90" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SplitNotFoundComponent() {
  return <HomeLoadFallback />;
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const { setHomepageCacheHeaders } = await import("@/lib/cache-headers");
    setHomepageCacheHeaders();
    // Kick off the rails query in parallel with SSR — non-blocking so it
    // doesn't delay HTML, but ready by the time the client hydrates.
    void context.queryClient.prefetchQuery(homeRailsQueryOptions);
    try {
      const slides = await context.queryClient.ensureQueryData(homeFeaturedSlidesQueryOptions);
      const featured = slides[0] ?? null;
      if (featured) {
        // Seed the single-featured cache so other consumers hit warm data.
        context.queryClient.setQueryData(homeFeaturedQueryOptions.queryKey, featured);
      }
      return featured;
    } catch (error) {
      console.error("home loader failed:", error);
      return null;
    }
  },

  head: ({ loaderData }) => ({
    meta: [
      { title: "ir.show — Home of Iranian cinema" },
      {
        name: "description",
        content:
          "A premium streaming destination for Iranian cinema. Originals, award-winners, documentaries, and curated collections. 90-day free trial.",
      },
      { property: "og:title", content: "ir.show — Home of Iranian cinema" },
      {
        property: "og:description",
        content:
          "A premium streaming destination for Iranian cinema. Originals, award-winners, documentaries, and curated collections.",
      },
      { property: "og:url", content: "https://ir.show/" },
      ...(loaderData?.thumbnail_url || loaderData?.cover_url || loaderData?.mobile_cover_url
        ? [
            {
              property: "og:image" as const,
              content: loaderData.thumbnail_url || loaderData.cover_url || loaderData.mobile_cover_url || "",
            },
            {
              name: "twitter:image" as const,
              content: loaderData.thumbnail_url || loaderData.cover_url || loaderData.mobile_cover_url || "",
            },
          ]
        : []),
    ],
    links: [
      { rel: "canonical", href: "https://ir.show/" },
      // Preload only URLs the matching viewport will ACTUALLY render.
      // Mobile <img> src (portraitImage) = mobile_cover_url || cover_url || thumbnail_url
      // Desktop <img> src (landscapeImage) = thumbnail_url || cover_url — never mobile_cover_url
      ...(() => {
        const mobileHref =
          loaderData?.mobile_cover_url || loaderData?.cover_url || loaderData?.thumbnail_url || "";
        const desktopHref =
          loaderData?.thumbnail_url_1280 || loaderData?.thumbnail_url || loaderData?.cover_url || "";
        const preloads: Array<{
          rel: "preload";
          as: "image";
          href: string;
          media: string;
          fetchPriority: "high";
        }> = [];
        if (mobileHref) {
          preloads.push({
            rel: "preload",
            as: "image",
            href: mobileHref,
            media: "(max-width: 767px)",
            fetchPriority: "high",
          });
        }
        // Skip desktop preload when it would duplicate the mobile one.
        if (desktopHref && desktopHref !== mobileHref) {
          preloads.push({
            rel: "preload",
            as: "image",
            href: desktopHref,
            media: "(min-width: 768px)",
            fetchPriority: "high",
          });
        }
        return preloads;
      })(),
    ],

    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ir.show",
          url: "https://ir.show",
          description:
            "A premium streaming destination for Iranian cinema. Originals, documentaries, and curated collections.",
        }),
      },
    ],
  }),
  component: Home,
  pendingComponent: HomePendingShell,
  errorComponent: ({ error }) => {
    console.error("home route error:", error);
    return <HomeLoadFallback />;
  },
  notFoundComponent: SplitNotFoundComponent,
});

function HomeLoadFallback() {
  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="home" />
      <main className="relative flex min-h-[100dvh] items-end overflow-hidden px-5 pb-14 sm:px-6 md:px-12 md:pb-20">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 70%, oklch(0.30 0.045 70 / 0.72), transparent 62%), linear-gradient(180deg, oklch(0.18 0 0), var(--bg-0))",
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-2xl">
            <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
              Original Iranian Cinema
            </span>
            <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-8xl">
              ir.show
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-cream/75 md:text-base">
              A premium streaming home for Iranian films, documentaries, and curated stories.
            </p>
            <Link
              to="/browse"
              className="mt-10 inline-flex items-center rounded-md bg-cream-bright px-8 py-3.5 text-sm font-semibold text-ink transition-all duration-300 hover:bg-cream"
            >
              Browse films
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="home" />
      <main>
        {/* 1. Cinematic hero = featured film */}
        <FeaturedFilm />
        <div className="h-3 bg-bg-0 md:hidden" aria-hidden />

        <DeferredHomeRails />

      </main>

      <SiteFooter />
    </div>
  );
}


