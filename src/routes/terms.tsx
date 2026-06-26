import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — IRAN" },
      { name: "description", content: "IRAN terms of service." },
      { property: "og:title", content: "Terms of Service — IRAN" },
      { property: "og:description", content: "IRAN terms of service." },
      { property: "og:url", content: "https://ir.show/terms" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-28 md:py-36">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
          {fa ? "قوانین" : "Terms"}
        </p>
        <h1 className={`text-4xl leading-[1.05] text-cream-bright md:text-5xl ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? "شرایط استفاده" : "Terms of Service"}
        </h1>
        <p className="mt-8 text-lg text-cream/75">
          {fa
            ? "شرایط کامل استفاده به‌زودی منتشر می‌شود."
            : "Our full terms of service are coming soon."}
        </p>
        <p className="mt-4 text-cream/65">
          {fa ? "برای هر پرسش، با ما در تماس باشید: " : "For any questions, contact us at "}
          <a href="mailto:hello@ir.show" className="text-amber underline-offset-4 hover:underline">
            hello@ir.show
          </a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
