import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LocaleProvider, useLocale } from "../lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { captureMemberGeo } from "../lib/member-geo.functions";
import { PageOverlayProvider } from "@/components/page-overlay";
import { AuthProvider } from "../lib/auth-context";
import { resolveVisitorRegion } from "../lib/region.functions";
import { MobileTabBar } from "@/components/mobile-tab-bar";

// Defer only the mirror notice. The mobile tab bar is visible chrome, so it
// renders with SSR to avoid the bottom bar popping in after first paint.
const IranMirrorBanner = lazy(() =>
  import("@/components/iran-mirror-banner").then((m) => ({ default: m.IranMirrorBanner })),
);


function useFaSafe(): boolean {
  try {
    return useLocale().locale === "fa";
  } catch {
    return false;
  }
}

function NotFoundComponent() {
  const fa = useFaSafe();
  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-0 px-6"
    >
      {/* Ambient amber glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(201,168,76,0.10), transparent 55%), linear-gradient(180deg, var(--bg-0), oklch(0.12 0 0))",
        }}
      />
      <div className="relative z-10 max-w-lg text-center">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.40em] text-amber/90">
          {fa ? "خطای ۴۰۴" : "Error 404"}
        </span>
        <h1
          className="mt-5 font-display text-[110px] font-medium leading-none tracking-[-0.05em] text-cream-bright md:text-[160px]"
          style={{ textShadow: "0 12px 60px rgba(201,168,76,0.20)" }}
        >
          404
        </h1>
        <div className="mx-auto mt-5 h-px w-16 bg-amber/60" aria-hidden />
        <h2 className="mt-6 font-display text-xl font-medium tracking-[-0.01em] text-cream md:text-2xl">
          {fa ? "این صحنه در آرشیو نیست" : "This reel isn't in the archive"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/55">
          {fa
            ? "صفحه‌ای که دنبالش هستید پیدا نشد یا جابه‌جا شده است."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cream-bright px-6 py-3 text-[13px] font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)] active:scale-[0.98]"
          >
            {fa ? "بازگشت به خانه" : "Back to home"}
          </Link>
          <Link
            to="/browse"
            className="inline-flex min-h-11 items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-all duration-300 hover:border-amber/50 hover:text-amber"
          >
            {fa ? "جست‌وجو در آثار" : "Browse films"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const fa = useFaSafe();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-0 px-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.08), transparent 55%), linear-gradient(180deg, var(--bg-0), oklch(0.12 0 0))",
        }}
      />
      <div className="relative z-10 max-w-lg text-center">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.40em] text-amber/90">
          {fa ? "خطا" : "Interruption"}
        </span>
        <h1
          className={`mt-5 font-display text-3xl font-medium tracking-[-0.02em] text-cream-bright md:text-4xl ${fa ? "font-vazir" : ""}`}
        >
          {fa ? "نمایش متوقف شد" : "Something interrupted the projection"}
        </h1>
        <div className="mx-auto mt-5 h-px w-16 bg-amber/60" aria-hidden />
        <p className={`mt-6 text-sm leading-relaxed text-cream/55 ${fa ? "font-vazir" : ""}`}>
          {fa
            ? "خطایی رخ داد. می‌توانید دوباره تلاش کنید یا به خانه برگردید."
            : "Something went wrong on our end. You can try again or head back home."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-cream-bright px-6 py-3 text-[13px] font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)] active:scale-[0.98]"
          >
            {fa ? "تلاش دوباره" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-all duration-300 hover:border-amber/50 hover:text-amber"
          >
            {fa ? "خانه" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Resolve region from headers/cookie at SSR so the very first byte is
  // already in the correct locale/RTL. No flash for Iran visitors.
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const w = window as Window & {
        __IRAN_REGION__?: { region: "iran" | "global"; locale: "en" | "fa" };
      };
      return {
        initialRegion:
          w.__IRAN_REGION__ ?? { region: "global" as const, locale: "en" as const },
      };
    }
    const r = await resolveVisitorRegion();
    return {
      initialRegion: {
        region: (r.region ?? "global") as "iran" | "global",
        locale: r.locale,
      },
    };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0807" },
      { title: "IRAN — Iranian short films, streaming worldwide" },
      {
        name: "description",
        content:
          "Stream original Iranian short films. Monthly membership with a 7-day free trial, plus Premium rentals. Bilingual, worldwide, no ads.",
      },
      { name: "author", content: "IRAN" },
      { property: "og:site_name", content: "IRAN" },
      { property: "og:title", content: "IRAN — Iranian short films, streaming worldwide" },
      {
        property: "og:description",
        content: "Original Iranian short films, streaming worldwide. 7-day free trial, then membership or Premium rentals. Bilingual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IRAN — Iranian short films, streaming worldwide" },
      { name: "twitter:description", content: "Original Iranian short films, streaming worldwide. 7-day free trial, then membership or Premium rentals." },
      { name: "google-site-verification", content: "zoKuyFN67EFMHi4pIwq3FrqFrbDasxMAE2kVfYSTGks" },
      { name: "enamad", content: "52799420" },
    ],
    links: [
      // Stylesheet is render-blocking by spec — preload it so the browser
      // starts fetching it the moment the HTML streams in, in parallel
      // with HTML parsing, instead of waiting until the parser reaches
      // the <link> tag. Combined with the inline critical CSS below, this
      // is the biggest FCP win available without splitting the stylesheet.
      { rel: "preload", as: "style", href: appCss, fetchPriority: "high" as const },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preconnect",
        href: "https://yasfnvftzwyuxdhpysof.supabase.co",
        crossOrigin: "anonymous",
      },
      // Webfont CSS is injected asynchronously by the inline script in
      // RootShell <head> (media=print swap pattern). Keeping it out of the
      // SSR <link> list ensures it never blocks first paint.
    ],

  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // beforeLoad resolves the region from request headers during SSR.
  const ctx = Route.useRouteContext();
  const initialRegion = ctx.initialRegion ?? { region: "global" as const, locale: "en" as const };
  const locale = initialRegion.locale;
  const region = initialRegion.region;
  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} data-region={region} suppressHydrationWarning>
      <head>
        {/*
          Critical above-the-fold CSS, inlined so the browser can paint
          the noir background + hero shell on the very first byte, without
          waiting for the Tailwind stylesheet to download/parse. Anything
          here MUST stay tiny (<2 KB gzipped) — everything else lives in
          the regular stylesheet.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;background:#0d0d0d;color:#f5f4ef;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}" +
              "body{min-height:100vh}" +
              "[data-mobile-hero]{position:relative;width:100%;height:100svh;min-height:620px;overflow:hidden;background:#1a1a1a}" +
              "@media(min-width:768px){[data-mobile-hero]{height:100dvh;min-height:640px}}" +
              ".hero-mobile-poster{position:absolute;inset:0;pointer-events:none}" +
              "img.cine-img{display:block;max-width:100%;height:auto}",
          }}
        />

        {/*
          Inject the resolved region as a global so <LocaleProvider> can
          initialize synchronously on the client — no useEffect flip, no
          flash of English for Iran visitors. Tab-bar visibility check
          stays inline so it runs before first paint.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `window.__IRAN_REGION__=${JSON.stringify({ region, locale })};` +
              // iPhone Safari exposes a smaller visual viewport while the
              // bottom URL bar is visible. Set the offset in the head script
              // before first paint so the tab bar never spends a frame glued
              // to the layout viewport and then jumps after React hydrates.
              `try{var vv=window.visualViewport;var r=document.documentElement;var u=function(){if(!vv)return;var g=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);r.style.setProperty('--vv-chrome-bottom',Math.round(g)+'px');};u();if(vv){vv.addEventListener('resize',function(){requestAnimationFrame(u);},{passive:true});}}catch(e){}` +
              `try{var p=location.pathname;if(p.indexOf('/watch/')===0||p.indexOf('/auth')===0||p.indexOf('/reset-password')===0||p.indexOf('/checkout')===0||p.indexOf('/admin')===0){document.documentElement.dataset.tabbar='hidden';}}catch(e){}` +
              // Inject the webfont stylesheet asynchronously so it never
              // blocks first paint. display=optional means the browser
              // uses the system fallback if the font isn't ready in ~100ms
              // and never swaps later — eliminates the layout shift the
              // large Persian/Latin headline caused on slow networks.
              // Locale-aware: Iran visitors only fetch Vazirmatn; global
              // visitors only fetch the Latin families.
              `try{var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(
                locale === "fa"
                  ? "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600&display=optional"
                  : "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=optional",
              )};l.media='print';l.onload=function(){this.media='all';};document.head.appendChild(l);}catch(e){}`,
          }}
        />

        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <PageOverlayProvider>
            <AuthInvalidator />
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <MobileTabBar />
            <DeferredChrome />
            <Toaster richColors position="top-center" />
          </PageOverlayProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Mounts the Iran mirror banner well after the first screen is stable.
 */
function DeferredChrome() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 6000 });
      return () => {
        const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback;
        if (cancel) cancel(id);
      };
    }
    const t = window.setTimeout(() => setReady(true), 5000);
    return () => window.clearTimeout(t);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <IranMirrorBanner />
    </Suspense>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    // Defer the geo capture until the browser is idle so it never competes
    // with hydration / hero paint on mobile.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const runGeo = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) captureMemberGeo().catch(() => {});
      });
    };
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(runGeo, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(runGeo, 2000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only react to real identity transitions. Without this filter we also
      // run on TOKEN_REFRESHED (~hourly + every tab focus) and INITIAL_SESSION
      // (every mount), which thrashes the router and query cache on mobile.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      // On sign-out, refetching protected queries against the cleared session
      // produces a 401 storm — skip the cache invalidation in that case.
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      if (session?.user) captureMemberGeo().catch(() => {});
    });
    return () => {
      subscription.unsubscribe();
      if (idleId !== null) {
        const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback;
        if (cancel) cancel(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [router, queryClient]);
  return null;
}

