import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — IRAN" },
      { name: "description", content: "IRAN privacy policy. How we handle your data." },
      { property: "og:title", content: "Privacy Policy — IRAN" },
      { property: "og:description", content: "IRAN privacy policy." },
      { property: "og:url", content: "https://ir.show/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-28 md:py-36">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
          {fa ? "حریم خصوصی" : "Privacy"}
        </p>
        <h1 className={`text-4xl leading-[1.05] text-cream-bright md:text-5xl ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? "سیاست حریم خصوصی" : "Privacy Policy"}
        </h1>
        <p className="mt-8 text-lg text-cream/75">
          {fa
            ? "سیاست کامل حریم خصوصی به‌زودی منتشر می‌شود."
            : "Our full privacy policy is coming soon."}
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
