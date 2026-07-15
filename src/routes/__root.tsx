import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Persian display face: self-hosted IranSansX Pro webfonts under
// /public/fonts, referenced from a static CSS file so the browser can
// cache both stylesheet and font files at our own origin.

import { reportLovableError } from "../lib/lovable-error-reporting";
import { verifyPersianFont } from "../lib/verify-persian-font";
import { LocaleProvider, useLocale } from "../lib/i18n";
import { supabase } from "@/integrations/supabase/client";
// Toaster (sonner) is lazy-loaded — it pulls a non-trivial chunk and is
// never needed for first paint. Mounted via DeferredChrome after idle.
const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);
import { captureMemberGeo } from "../lib/member-geo.functions";
import { PageOverlayProvider } from "@/components/page-overlay";
import { AuthProvider } from "../lib/auth-context";
import { resolveVisitorRegion } from "../lib/region.functions";
// MobileTabBar is visible chrome but not LCP — defer to shrink the
// main bundle's homepage critical path.
const MobileTabBar = lazy(() =>
  import("@/components/mobile-tab-bar").then((m) => ({ default: m.MobileTabBar })),
);

// Defer only the mirror notice. The mobile tab bar is visible chrome, so it
// renders with SSR to avoid the bottom bar popping in after first paint.
const IranMirrorBanner = lazy(() =>
  import("@/components/iran-mirror-banner").then((m) => ({ default: m.IranMirrorBanner })),
);
const WelcomeRegionModal = lazy(() =>
  import("@/components/welcome-region-modal").then((m) => ({ default: m.WelcomeRegionModal })),
);


function useFaSafe(): boolean {
  try {
    return useLocale().locale === "fa";
  } catch {
    return false;
  }
}

import { NotFoundPage } from "./not-found";

function NotFoundComponent() {
  return <NotFoundPage />;
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
          w.__IRAN_REGION__ ?? { region: "iran" as const, locale: "fa" as const },
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
      { name: "author", content: "IRAN" },
      // Site-wide defaults only. Per-route title, description, and og:*
      // tags live on each route's head() to avoid PostRest concatenation
      // producing duplicate title/meta tags.
      { property: "og:site_name", content: "IRAN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "zoKuyFN67EFMHi4pIwq3FrqFrbDasxMAE2kVfYSTGks" },
      { name: "enamad", content: "52799420" },
    ],
    links: [
      // Stylesheet is render-blocking by spec — preload it so the browser
      // starts fetching it the moment the HTML streams in, in parallel
      // with HTML parsing, instead of waiting until the parser reaches
      // the <link> tag.
      { rel: "preload", as: "style", href: appCss, fetchPriority: "high" as const },
      { rel: "stylesheet", href: appCss },
      // IranSansX Pro — self-hosted Persian display face. Static file,
      // same-origin, cached by the browser and Cloudflare edge.
      // NOTE: Do NOT preload the WOFF2 files. The @font-face uses
      // `font-display: optional` (fallback paints immediately) and the
      // unicode-range is Arabic-only, so English visitors never need it.
      // Preloading steals bandwidth from the hero LCP image on mobile
      // and drops PSI-mobile by 5–10 points for no visible gain.
      { rel: "stylesheet", href: "/fonts/iransansx.css" },
      // Supabase storage is the origin for the hero LCP image.
      {
        rel: "preconnect",
        href: "https://yasfnvftzwyuxdhpysof.supabase.co",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://yasfnvftzwyuxdhpysof.supabase.co" },
      { rel: "dns-prefetch", href: "https://payment.zarinpal.com" },
      { rel: "dns-prefetch", href: "https://www.zarinpal.com" },
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
    <html lang={locale || "en"} dir={dir} data-region={region} suppressHydrationWarning>
      <head>
        {/*
          Inject the resolved region as a global so <LocaleProvider> can
          initialize synchronously on the client — no useEffect flip, no
          flash of English for Iran visitors. Tab-bar visibility check
          stays inline so it runs before first paint.

          Fonts:
          - fa: self-hosted IranSansX Pro via /fonts/iransansx.css (linked
            in the route head above). Cached at the browser and edge with
            a swap policy so Tahoma/Arial paints instantly on slow links.
          - en: Space Grotesk + DM Sans from Google Fonts, lazy-applied
            via media=print swap to keep them off the critical path.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `window.__IRAN_REGION__=${JSON.stringify({ region, locale })};` +
              `try{var p=location.pathname;if(p.indexOf('/watch/')===0||p.indexOf('/auth')===0||p.indexOf('/reset-password')===0||p.indexOf('/checkout')===0||p.indexOf('/admin')===0){document.documentElement.dataset.tabbar='hidden';}}catch(e){}` +

              (locale === "fa"
                ? ""
                 : `try{var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(
                    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=optional",
                  )};l.media='print';l.onload=function(){this.media='all';};document.head.appendChild(l);setTimeout(function(){if(l.media!=='all'){try{l.remove();}catch(e){}}},3000);}catch(e){}`),
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
  const { queryClient, initialRegion } = Route.useRouteContext();
  const region = initialRegion?.region ?? "iran";
  useEffect(() => {
    verifyPersianFont();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider initialRegion={region}>
          <PageOverlayProvider>
            <AuthInvalidator />
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <Suspense fallback={null}><MobileTabBar /></Suspense>
            {/* Welcome popup is a first-visit UX element — mount immediately,
                not behind requestIdleCallback, so it shows as soon as the page
                is interactive. */}
            <Suspense fallback={null}><WelcomeRegionModal /></Suspense>
            <DeferredChrome />
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
      <Toaster richColors position="top-center" />
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

