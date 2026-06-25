import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { FeaturedFilm } from "../components/featured-film";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { MountWhenNear } from "../components/mount-when-near";
import { homePageQueryOptions } from "@/lib/home.functions";

// Below-the-fold rails are lazy-loaded and only mounted when the user
// approaches them. Cuts ~80–120 KB of JS off the homepage initial bundle
// and removes their queries / image lists from the hydration critical path.
const FilmsRow = lazy(() =>
  import("../components/films-row").then((m) => ({ default: m.FilmsRow })),
);
const ContinueWatching = lazy(() =>
  import("../components/continue-watching").then((m) => ({ default: m.ContinueWatching })),
);



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
  loader: ({ context }) => context.queryClient.ensureQueryData(homePageQueryOptions),
  head: ({ loaderData }) => ({
    meta: [
      { title: "ir.show — Home of Iranian cinema" },
      {
        name: "description",
        content:
          "A premium streaming destination for Iranian cinema. Originals, award-winners, documentaries, and curated collections. 7-day free trial.",
      },
      { property: "og:title", content: "ir.show — Home of Iranian cinema" },
      {
        property: "og:description",
        content:
          "A premium streaming destination for Iranian cinema. Originals, award-winners, documentaries, and curated collections.",
      },
      { property: "og:url", content: "https://ir.show/" },
      ...(loaderData?.featured?.thumbnail_url || loaderData?.featured?.cover_url || loaderData?.featured?.mobile_cover_url
        ? [
            {
              property: "og:image" as const,
              content: loaderData.featured.thumbnail_url || loaderData.featured.cover_url || loaderData.featured.mobile_cover_url || "",
            },
            {
              name: "twitter:image" as const,
              content: loaderData.featured.thumbnail_url || loaderData.featured.cover_url || loaderData.featured.mobile_cover_url || "",
            },
          ]
        : []),
    ],
    links: [
      { rel: "canonical", href: "https://ir.show/" },
      ...(loaderData?.featured?.thumbnail_url || loaderData?.featured?.cover_url || loaderData?.featured?.mobile_cover_url
        ? [
            {
              rel: "preload" as const,
              as: "image" as const,
              href: loaderData.featured.mobile_cover_url || loaderData.featured.cover_url || loaderData.featured.thumbnail_url || "",
              media: "(max-width: 767px)" as const,
              imageSizes: "100vw" as const,
              fetchPriority: "high" as const,
            },
            {
              rel: "preload" as const,
              as: "image" as const,
              href: loaderData.featured.thumbnail_url || loaderData.featured.cover_url || loaderData.featured.mobile_cover_url || "",
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
        <FeaturedFilm />

        {/* 2. Continue Watching (logged-in only, hides itself otherwise) */}
        <MountWhenNear rootMargin="300px" minHeight={240}>
          <Suspense fallback={null}>
            <div className="pt-10 md:pt-14">
              <ContinueWatching />
            </div>
          </Suspense>
        </MountWhenNear>

        {/* 3. Editorial rails — capped at 4 total (Originals, New Releases, 2 categories) */}
        <MountWhenNear rootMargin="300px" minHeight={400}>
          <Suspense fallback={null}>
            <div className="space-y-12 pb-20 pt-10 md:space-y-16 md:pb-28 md:pt-14">
              <FilmsRow />
            </div>
          </Suspense>
        </MountWhenNear>

      </main>

      <SiteFooter />
    </div>
  );
}


