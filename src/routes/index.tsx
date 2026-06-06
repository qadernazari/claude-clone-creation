import { createFileRoute, Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { FilmsRow } from "../components/films-row";
import { FeaturedFilm } from "../components/featured-film";
import { ContinueWatching } from "../components/continue-watching";
import { CollectionsGrid } from "../components/collections-grid";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { FaqSection } from "../components/faq-section";
import { useSubscription } from "@/hooks/use-subscription";
import { AcceptTrialButton } from "@/components/accept-trial-button";
import { homePageQueryOptions } from "@/lib/home.functions";

function HomePendingShell() {
  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="home" />
      <main className="relative h-[82svh] min-h-[520px] overflow-hidden bg-bg-1 md:h-[100dvh] md:min-h-[640px]">
        <div className="hero-mobile-skeleton absolute inset-0" aria-hidden />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,13,0.12) 0%, rgba(13,13,13,0.48) 70%, var(--bg-0) 100%)",
          }}
          aria-hidden
        />
      </main>
    </div>
  );
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
              fetchpriority: "high" as const,
            },
            {
              rel: "preload" as const,
              as: "image" as const,
              href: loaderData.featured.thumbnail_url || loaderData.featured.cover_url || loaderData.featured.mobile_cover_url || "",
              media: "(min-width: 768px)" as const,
              fetchpriority: "high" as const,
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
  notFoundComponent: HomeLoadFallback,
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
              className="mt-10 inline-flex items-center rounded-full bg-cream-bright px-8 py-3.5 text-sm font-semibold text-ink transition-all duration-300 hover:bg-cream"
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

      {/* 1. Cinematic hero = featured film (no second marketing hero) */}
      <FeaturedFilm />

      {/* 2. Continue Watching (logged-in only, hides itself otherwise) */}
      <div className="pt-8 md:pt-14">
        <ContinueWatching />
      </div>

      {/* 3-8. Editorial rails: Originals (flagship), New Releases, category rails */}
      <div className="space-y-10 pb-14 pt-8 md:space-y-16 md:pb-20 md:pt-14">
        <FilmsRow />
      </div>

      {/* 9. Collections — editorial destinations */}
      <CollectionsGrid />

      {/* 10. Membership — one quiet moment */}
      <div className="px-5 pb-14 pt-16 md:px-12 md:pb-20 md:pt-24">
        <MembershipMoment />
      </div>

      {/* 11. FAQ — trust + SEO */}
      <FaqSection />



      <SiteFooter />
    </div>
  );
}

function MembershipMoment() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { isMember, isLoading } = useSubscription();

  // Hide entirely for active members — no upsell noise
  if (isLoading || isMember) return null;

  const benefits = fa
    ? ["هفت روز رایگان", "بدون نیاز به اطلاعات پرداخت", "تماشای نامحدودِ مجموعه", "هر زمان لغو کنید"]
    : ["7 days free", "No payment information required", "Unlimited access to the membership catalog", "Cancel anytime"];

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-cream/[6%] bg-bg-1/40 px-8 py-20 text-center md:px-16 md:py-24">
      {/* very subtle amber glow — only place gold appears in this section */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.77 0.115 80 / 0.10), transparent 60%)",
        }}
      />
      <h2 className="font-display text-3xl font-medium leading-[1.05] tracking-[-0.02em] text-cream-bright md:text-5xl">
        {fa ? (
          <>
            سینمای ایران,{" "}
            <span className="font-editorial italic font-normal text-amber">دست‌نخورده</span>.
          </>
        ) : (
          <>
            Iranian cinema,{" "}
            <span className="font-editorial italic font-normal text-amber">unfiltered</span>.
          </>
        )}
      </h2>

      <ul className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 text-[14px] text-cream/70">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <AcceptTrialButton
          className="inline-flex items-center gap-2 rounded-full bg-amber px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-amber-bright hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_oklch(0.77_0.115_80/0.5)] disabled:opacity-70"
          label={fa ? "پذیرش دوره آزمایشی رایگان" : "Accept Free Trial"}
        />
      </div>
    </div>
  );
}
