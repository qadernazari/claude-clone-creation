import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Youtube } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — IRAN" },
      {
        name: "description",
        content: "Get in touch with IRAN. Questions, bug reports, partnerships, or just a hello.",
      },
      { property: "og:title", content: "Contact — IRAN" },
      { property: "og:description", content: "Get in touch with IRAN." },
      { property: "og:url", content: "https://ir.show/contact" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={dir} className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
            {fa ? "تماس" : "Contact"}
          </p>
          <h1
            className={`text-4xl leading-[1.05] text-cream-bright md:text-6xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "خوشحال می‌شویم از شما بشنویم." : "We'd love to hear from you."}
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-cream/70">
            {fa
              ? "سوال، گزارش مشکل، یا فقط یک سلام — بنویسید."
              : "Whether it's a question, a bug report, or just a hello — reach out."}
          </p>

          <div className="mt-14">
            <a
              href="mailto:hello@ir.show"
              className={`inline-block text-3xl text-amber transition-colors hover:underline md:text-5xl ${fa ? "font-vazir" : "font-display"}`}
            >
              hello@ir.show
            </a>
            <p className="mt-5 text-[13px] tracking-wide text-cream/50">
              {fa
                ? "معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم."
                : "We typically respond within 24 hours."}
            </p>
          </div>

          <div className="mt-16 border-t border-amber/15 pt-8">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/70">
              {fa ? "ما را دنبال کنید" : "Follow along"}
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/iran.show"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={fa ? "ایران در اینستاگرام" : "IRAN on Instagram"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cream/15 text-cream/60 transition-colors hover:border-cream/35 hover:text-cream"
              >
                <Instagram size={18} aria-hidden />
              </a>
              <a
                href="https://www.youtube.com/@iranshow"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={fa ? "ایران در یوتیوب" : "IRAN on YouTube"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cream/15 text-cream/60 transition-colors hover:border-cream/35 hover:text-cream"
              >
                <Youtube size={18} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
