import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLocale } from "../lib/i18n";
import { FilmsRow } from "../components/films-row";
import { FeaturedFilm } from "../components/featured-film";
import { ContinueWatching } from "../components/continue-watching";
import { CollectionsGrid } from "../components/collections-grid";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { MembershipCheckout } from "../components/membership-checkout";
import { FaqSection } from "../components/faq-section";
import { useSubscription } from "@/hooks/use-subscription";


export const Route = createFileRoute("/")({
  head: () => ({
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
    ],
    links: [{ rel: "canonical", href: "https://ir.show/" }],
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
});

function Home() {
  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="home" />

      {/* 1. Cinematic hero = featured film (no second marketing hero) */}
      <FeaturedFilm />

      {/* 2. Continue Watching (logged-in only, hides itself otherwise) */}
      <div className="pt-16 md:pt-20">
        <ContinueWatching />
      </div>

      {/* 3-8. Editorial rails: Originals (flagship), New Releases, category rails */}
      <div className="pt-16 pb-28 md:pt-20 md:pb-36 space-y-24 md:space-y-28">
        <FilmsRow />
      </div>

      {/* 9. Collections — editorial destinations */}
      <CollectionsGrid />

      {/* 10. Membership — one quiet moment */}
      <div className="px-6 pt-32 pb-28 md:px-12 md:pt-40 md:pb-32">
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
  const { user, isMember, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  // Hide entirely for active members — no upsell noise
  if (isLoading || isMember) return null;

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&membership=1`
      : "";

  const benefits = fa
    ? ["هفت روز رایگان", "تماشای نامحدودِ مجموعه", "هر زمان لغو کنید"]
    : ["7 days free", "Unlimited access to the membership catalog", "Cancel anytime"];

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-cream/[0.06] bg-bg-1/40 px-8 py-20 text-center md:px-16 md:py-24">
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
            سینمای ایران،{" "}
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
        {user ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-amber px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-amber-bright hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_oklch(0.77_0.115_80/0.5)]"
          >
            {fa ? "آغاز رایگان" : "Start Free Trial"}
          </button>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-amber px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-amber-bright hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_oklch(0.77_0.115_80/0.5)]"
          >
            {fa ? "آغاز رایگان" : "Start Free Trial"}
          </Link>
        )}
      </div>

      {open && (
        <MembershipCheckout returnUrl={returnUrl} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
