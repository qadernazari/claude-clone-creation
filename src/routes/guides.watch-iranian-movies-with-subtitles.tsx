import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/lib/i18n";

const CANONICAL = "https://ir.show/guides/watch-iranian-movies-with-subtitles";

export const Route = createFileRoute("/guides/watch-iranian-movies-with-subtitles")({
  head: () => ({
    meta: [
      { title: "Where to watch Iranian movies with English subtitles" },
      {
        name: "description",
        content:
          "A practical guide to streaming Iranian films with reliable English subtitles — where to find them, what to expect from subtitle quality, and how to start on IRAN.",
      },
      { property: "og:title", content: "Where to watch Iranian movies with English subtitles" },
      {
        property: "og:description",
        content:
          "A practical guide to streaming Iranian films with reliable English subtitles worldwide.",
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Where to watch Iranian movies with English subtitles",
          description:
            "A practical guide to streaming Iranian films with reliable English subtitles worldwide.",
          author: { "@type": "Organization", name: "IRAN" },
          publisher: { "@type": "Organization", name: "IRAN" },
          mainEntityOfPage: CANONICAL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  const { dir } = useLocale();
  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <article className="prose prose-invert">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
            Guide
          </span>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-cream-bright md:text-5xl">
            Where to watch Iranian movies with English subtitles
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-cream/75">
            Iranian cinema has produced some of the most quietly powerful films of the last fifty
            years — but finding them online with reliable English subtitles isn't always
            straightforward. This short guide covers what to look for, where to start, and how IRAN
            fits in.
          </p>

          <h2 className="mt-12 font-display text-2xl font-medium text-cream-bright">
            Why subtitles matter for Iranian films
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/70">
            Persian dialogue is often layered with poetry, idiom, and cultural reference.
            Machine-translated subtitles flatten that texture. Look for platforms where subtitles
            are professionally translated by humans who know the source language and the cinematic
            tradition it comes from.
          </p>

          <h2 className="mt-10 font-display text-2xl font-medium text-cream-bright">
            What to look for in a streaming platform
          </h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-cream/70">
            <li>Human-translated English (and Persian) subtitle tracks, not auto-generated.</li>
            <li>Original-language audio preserved — no dubs replacing the actor's voice.</li>
            <li>HD streaming, so calligraphy, faces, and landscapes read clearly.</li>
            <li>Global availability — many Iranian titles are geo-locked on regional services.</li>
            <li>A curated catalog rather than an algorithmic feed.</li>
          </ul>

          <h2 className="mt-10 font-display text-2xl font-medium text-cream-bright">
            How IRAN handles subtitles
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/70">
            Every original film on IRAN ships with bilingual subtitle tracks — English and Persian
            — reviewed by editors who work in both languages. You can switch tracks mid-film, and
            HD streaming is available on phone, tablet, and desktop. There's a 90-day free trial,
            then monthly membership or one-off Premium rentals.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/browse"
              className="inline-flex min-h-11 items-center rounded-md bg-cream-bright px-6 py-3 text-[13px] font-semibold text-ink transition-all duration-300 hover:scale-[1.02]"
            >
              Browse films with subtitles
            </Link>
            <Link
              to="/membership"
              className="inline-flex min-h-11 items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-all duration-300 hover:border-amber/50 hover:text-amber"
            >
              See membership plans
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
