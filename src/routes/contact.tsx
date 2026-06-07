import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — IRAN" },
      {
        name: "description",
        content: "Get in touch with IRAN. Questions, partnerships, or feedback welcome.",
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
            {fa ? "با ما در ارتباط باشید" : "Get in touch"}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/70">
            {fa
              ? "برای سؤال، همکاری یا ارسال اثر، مستقیماً به ما ایمیل بزنید. معمولاً ظرف ۲ روز کاری پاسخ می‌دهیم."
              : "Email us directly for questions, partnerships, or submissions. We usually reply within 2 business days."}
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="hairline rounded-2xl border bg-bg-1/40 p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/45">
                {fa ? "عمومی" : "General"}
              </p>
              <a
                href="mailto:hello@ir.show"
                className="mt-2 block font-display text-xl text-cream-bright transition-colors hover:text-amber"
              >
                hello@ir.show
              </a>
              <p className="mt-2 text-sm text-cream/55">
                {fa ? "سؤال، بازخورد و حساب." : "Questions, feedback, account help."}
              </p>
            </div>
            <div className="hairline rounded-2xl border bg-bg-1/40 p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/45">
                {fa ? "فیلم‌سازان و همکاران" : "Filmmakers & partners"}
              </p>
              <a
                href="mailto:partners@ir.show"
                className="mt-2 block font-display text-xl text-cream-bright transition-colors hover:text-amber"
              >
                partners@ir.show
              </a>
              <p className="mt-2 text-sm text-cream/55">
                {fa ? "ارسال اثر، توزیع، جشنواره‌ها." : "Submissions, distribution, festivals."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
