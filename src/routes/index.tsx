import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HeroCarousel } from "../components/prime/hero-carousel";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { homeFeaturedQueryOptions, homeRailsQueryOptions } from "@/lib/home.functions";

// Below-the-fold rails are lazy-loaded and only mounted when the user
// approaches them. Cuts ~80–120 KB of JS off the homepage initial bundle
// and removes their queries / image lists from the hydration critical path.
const HomeRails = lazy(() =>
  import("../components/prime/home-rails").then((m) => ({ default: m.HomeRails })),
);
const ContinueWatching = lazy(() =>
  import("../components/continue-watching").then((m) => ({ default: m.ContinueWatching })),
);

// Warm the lazy chunks + rails data on idle so the moment the user scrolls
// the rails render instantly — no chunk fetch, no query wait.
function prefetchRails(queryClient: ReturnType<typeof useQueryClient>) {
  void import("../components/prime/home-rails");
  void import("../components/continue-watching");
  void queryClient.prefetchQuery(homeRailsQueryOptions);
}

function DeferredHomeRails() {
  const [show, setShow] = useState(false);
  const queryClient = useQueryClient();

  // Idle prefetch — runs ~after hero paints, before user even scrolls.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const run = () => prefetchRails(queryClient);
    if (w.requestIdleCallback) {
      w.requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 600);
    }
  }, [queryClient]);

  useEffect(() => {
    const reveal = () => {
      if (window.scrollY > 60) setShow(true);
    };
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("wheel", reveal, { passive: true });
    window.addEventListener("touchmove", reveal, { passive: true });
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("wheel", reveal);
      window.removeEventListener("touchmove", reveal);
    };
  }, []);

  if (!show) {
    return <div className="min-h-[640px]" aria-hidden />;
  }

  return (
    <>
      <Suspense fallback={<div className="min-h-[240px]" aria-hidden />}>
        <div className="pt-10 md:pt-14">
          <ContinueWatching />
        </div>
      </Suspense>
      <Suspense fallback={<div className="min-h-[400px]" aria-hidden />}>
        <div className="space-y-12 pb-20 pt-10 md:space-y-16 md:pb-28 md:pt-14">
          <HomeRails />
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
    return context.queryClient.ensureQueryData(homeFeaturedQueryOptions);
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
      ...(loaderData?.thumbnail_url || loaderData?.cover_url || loaderData?.mobile_cover_url
        ? [
            {
              rel: "preload" as const,
              as: "image" as const,
              href: loaderData.mobile_cover_url || loaderData.cover_url || loaderData.thumbnail_url_mobile || loaderData.thumbnail_url || "",
              media: "(max-width: 767px)" as const,
              imageSizes: "100vw" as const,
              fetchPriority: "high" as const,
            },
            {
              rel: "preload" as const,
              as: "image" as const,
              href: loaderData.thumbnail_url || loaderData.cover_url || loaderData.mobile_cover_url || "",
              media: "(min-width: 768px)" as const,
              fetchPriority: "high" as const,
            },
          ]
        : []),
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
        <HeroCarousel />
        <div className="h-3 bg-bg-0 md:hidden" aria-hidden />

        <DeferredHomeRails />

      </main>

      <SiteFooter />
    </div>
  );
}


