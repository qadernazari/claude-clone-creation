import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { FAQ_EN, FAQ_FA } from "@/lib/faq";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — IRAN" },
      {
        name: "description",
        content:
          "Answers to common questions about IRAN: free trial, devices, cancellation, payment methods, subtitles, and watching from Iran.",
      },
      { property: "og:title", content: "Help & FAQ — IRAN" },
      {
        property: "og:description",
        content: "Free trial, devices, cancellation, payments, subtitles, and watching from Iran.",
      },
      { property: "og:url", content: "https://ir.show/help" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/help" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_EN.map((q) => ({
            "@type": "Question",
            name: q.q,
            acceptedAnswer: { "@type": "Answer", text: q.a },
          })),
        }),
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  const items = fa ? FAQ_FA : FAQ_EN;
  const [open, setOpen] = useState<number | null>(0);

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
            {fa ? "راهنما" : "Help"}
          </p>
          <h1
            className={`text-4xl leading-[1.05] text-cream-bright md:text-6xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "پرسش‌های پرتکرار." : "Frequently asked questions."}
          </h1>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-6 pb-24">
          <ul className="border-t border-amber/15">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={i} className="border-b border-amber/15">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-start"
                  >
                    <span className="text-[15px] font-medium text-cream-bright">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`shrink-0 text-amber transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pe-8 text-[14px] leading-relaxed text-cream/65">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
