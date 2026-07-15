import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/lib/i18n";

const CANONICAL = "https://ir.show/guides/best-iranian-movies";

export const Route = createFileRoute("/guides/best-iranian-movies")({
  head: () => ({
    meta: [
      { title: "The Best Iranian Movies — Essential Iranian Cinema Guide" },
      {
        name: "description",
        content:
          "A curated guide to the best Iranian movies — essential films, directors, and why Iranian cinema became one of the most respected in the world.",
      },
      { property: "og:title", content: "The Best Iranian Movies — Essential Iranian Cinema" },
      {
        property: "og:description",
        content:
          "Essential Iranian films every cinephile should know — a curated guide for global audiences.",
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
          headline: "The Best Iranian Movies — Essential Iranian Cinema Guide",
          description:
            "A curated guide to essential Iranian films and why Iranian cinema is so celebrated.",
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
            The Best Iranian Movies: Essential Iranian Cinema for Global Audiences
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-cream/75">
            For more than four decades, Iranian filmmakers have shaped one of the most quietly
            influential cinematic traditions in the world. Below is a curated list of the best
            Iranian movies — the essential viewing that explains why Iranian cinema is so
            revered by critics, festivals, and filmmakers alike.
          </p>

          <h2 className="mt-12 font-display text-2xl font-medium text-cream-bright">
            Why Iranian cinema is so good
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/70">
            Iranian films prize observation over spectacle. Directors like Abbas Kiarostami,
            Asghar Farhadi, and Jafar Panahi turned everyday ethical dilemmas — a lost shoe, a
            forged signature, a family caught between duty and desire — into moral cinema of
            rare precision. That restraint, paired with a poetic realist tradition rooted in
            Persian literature, is what makes the country's best films travel so far beyond its
            borders.
          </p>

          <h2 className="mt-12 font-display text-2xl font-medium text-cream-bright">
            Ten essential Iranian films
          </h2>
          <ol className="mt-3 space-y-4 text-[15px] leading-relaxed text-cream/75">
            <li>
              <strong className="text-cream-bright">A Separation (2011)</strong> — Asghar
              Farhadi's Oscar-winning drama about a couple's divorce and the working-class
              caregiver caught in the middle. The gold standard for contemporary Iranian
              cinema.
            </li>
            <li>
              <strong className="text-cream-bright">Close-Up (1990)</strong> — Kiarostami's
              docu-fiction masterpiece about a man who impersonated the filmmaker Mohsen
              Makhmalbaf. Endlessly reinventive.
            </li>
            <li>
              <strong className="text-cream-bright">Taste of Cherry (1997)</strong> — Palme
              d'Or winner. A man drives through the hills outside Tehran looking for someone
              to bury him.
            </li>
            <li>
              <strong className="text-cream-bright">Children of Heaven (1997)</strong> —
              Majid Majidi's tender story of a brother and sister sharing one pair of shoes.
              Nominated for the foreign-language Oscar.
            </li>
            <li>
              <strong className="text-cream-bright">The Salesman (2016)</strong> — Farhadi's
              second Academy Award winner. Marriage, dignity, and revenge in modern Tehran.
            </li>
            <li>
              <strong className="text-cream-bright">Where Is the Friend's House? (1987)</strong>
              — The first film in Kiarostami's Koker trilogy. A schoolboy's small act of
              conscience becomes an epic.
            </li>
            <li>
              <strong className="text-cream-bright">The Circle (2000)</strong> — Jafar
              Panahi's Venice-winning look at the constraints on women's lives.
            </li>
            <li>
              <strong className="text-cream-bright">The Color of Paradise (1999)</strong> —
              Majidi's luminous drama about a blind boy and his father.
            </li>
            <li>
              <strong className="text-cream-bright">This Is Not a Film (2011)</strong> —
              Panahi's smuggled-out video-diary made under house arrest. Cinema at its most
              defiant.
            </li>
            <li>
              <strong className="text-cream-bright">The Cow (1969)</strong> — Dariush
              Mehrjui's landmark of the pre-revolution Iranian New Wave. The film that put
              Iranian cinema on the international map.
            </li>
          </ol>

          <h2 className="mt-12 font-display text-2xl font-medium text-cream-bright">
            Where to start on IRAN
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/70">
            The classics above are widely available on the festival circuit and archive
            platforms. IRAN focuses on <em>original Iranian short films</em> — the next
            generation of filmmakers working in that same tradition. Membership unlocks the
            full catalog, in HD, with human-translated English and Persian subtitles.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/browse"
              className="inline-flex items-center rounded-md bg-amber px-6 py-3 text-[13px] font-semibold text-ink transition-colors hover:bg-amber/90"
            >
              Browse films on IRAN
            </Link>
            <Link
              to="/membership"
              className="inline-flex items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-colors hover:border-amber/50 hover:text-amber"
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
