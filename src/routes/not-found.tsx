import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/not-found")({
  head: () => ({
    meta: [
      { title: "Page Not Found — IRAN" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "The page you're looking for doesn't exist.",
      },
    ],
  }),
  component: NotFoundPage,
});

export function NotFoundPage() {
  let fa = false;
  try {
    fa = useLocale().locale === "fa";
  } catch {
    fa = false;
  }

  return (
    <div dir={fa ? "rtl" : "ltr"} className="flex min-h-screen flex-col bg-bg-0">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-20">
        {/* Ambient amber glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.08), transparent 55%)",
          }}
        />

        {/* Ghost 404 watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        >
          <span
            className="font-display font-medium leading-none tracking-[-0.06em] text-cream"
            style={{
              fontSize: "clamp(220px, 42vw, 560px)",
              opacity: 0.05,
              textShadow: "0 20px 80px rgba(201,168,76,0.10)",
            }}
          >
            404
          </span>
        </div>

        {/* Centered content */}
        <div className="relative z-10 max-w-xl text-center">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.40em] text-amber/90">
            {fa ? "صفحه یافت نشد" : "Page not found"}
          </span>
          <h1
            className={`mt-6 font-display text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-cream-bright md:text-6xl ${fa ? "font-vazir" : ""}`}
          >
            {fa ? "در تاریکی گم شدید." : "Lost in the dark."}
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-amber/60" aria-hidden />
          <p
            className={`mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-cream/60 ${fa ? "font-vazir" : ""}`}
          >
            {fa
              ? "این صفحه وجود ندارد — اما فیلم‌هایی هستند که ارزش دیدن دارند."
              : "This page doesn't exist — but there are films worth finding."}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/browse"
              className="inline-flex min-h-11 items-center rounded-md bg-cream-bright px-6 py-3 text-[13px] font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)] active:scale-[0.98]"
            >
              {fa ? "مرور فیلم‌ها" : "Browse Films"}
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-all duration-300 hover:border-amber/50 hover:text-amber"
            >
              {fa ? "خانه" : "Go Home"}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
