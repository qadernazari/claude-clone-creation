import { useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { useAuthState } from "@/lib/auth-context";

/**
 * Keep the tab bar pinned to the *visual* viewport bottom on iOS Safari.
 *
 * With `viewport-fit=cover`, `position: fixed; bottom: 0` anchors to the
 * LAYOUT viewport — the area behind Safari's bottom toolbar on first paint.
 * That makes the bar (and the body's bottom padding) visibly "slide down"
 * the moment the user scrolls and Safari's chrome collapses.
 *
 * We compute the chrome offset = `window.innerHeight - visualViewport.height
 * - visualViewport.offsetTop` and expose it as `--vv-chrome-bottom` on
 * <html>. The tab bar and body padding read that variable and lift the bar
 * above the chrome from the first frame.
 *
 * Crucially we only listen to `visualViewport.resize` — NOT `scroll` —
 * because resize fires once when Safari shows/hides chrome, while scroll
 * fires every frame and caused the jitter the previous attempt hit.
 */
function useVisualViewportChromeOffset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const gap = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      root.style.setProperty("--vv-chrome-bottom", `${Math.round(gap)}px`);
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    update();
    vv.addEventListener("resize", schedule);
    return () => {
      vv.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
}

/**
 * Native-app-style bottom tab bar for mobile.
 * Visible only on small screens (<md). Hidden on the immersive
 * watch player and on auth / checkout routes to maximize content.
 *
 * Layout stability rules:
 *  - The bar always renders the same 4 tabs (Home, Browse, Library, Account).
 *    Unauthenticated users get their Library tab linked to /auth so the
 *    geometry never shifts when the auth state resolves after mount.
 *  - Visibility is driven purely by CSS (`html[data-tabbar="hidden"]`).
 *    The inline boot script in `__root.tsx` sets that attribute from the
 *    URL pathname BEFORE first paint, so hidden routes never reserve space
 *    and visible routes never give it back.
 *  - The bar sits at `bottom: 0` + `env(safe-area-inset-bottom)`. We
 *    deliberately do NOT listen to visualViewport changes — the per-scroll
 *    style writes that produced caused visible jitter on iOS.
 */
export function MobileTabBar() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const location = useLocation();
  const { user } = useAuthState();

  const path = location.pathname;
  const hidden =
    path.startsWith("/watch/") ||
    path.startsWith("/auth") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/checkout") ||
    path.startsWith("/admin");

  useVisualViewportChromeOffset();

  if (hidden) return null;

  const isHome = path === "/";
  const isBrowse = path === "/browse";
  const isLibrary =
    path.startsWith("/library") || path.startsWith("/my-tickets");
  const isAccount = path.startsWith("/account") || path === "/auth";
  const showLibrary = !!user;

  return (
    <nav
      aria-label={fa ? "ناوبری" : "Primary"}
      dir={fa ? "rtl" : "ltr"}
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-cream/8 bg-bg-0/85 backdrop-blur-xl md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        transform: "translateY(calc(-1 * var(--vv-chrome-bottom, 0px)))",
        willChange: "transform",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        <TabItem
          to="/"
          label={fa ? "خانه" : "Home"}
          active={isHome}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10.5V20h14v-9.5" />
            </svg>
          }
        />
        <TabItem
          to="/browse"
          label={fa ? "آثار" : "Browse"}
          active={isBrowse}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="7" height="7" rx="1.4" />
              <rect x="14" y="4" width="7" height="7" rx="1.4" />
              <rect x="3" y="13" width="7" height="7" rx="1.4" />
              <rect x="14" y="13" width="7" height="7" rx="1.4" />
            </svg>
          }
        />
        {showLibrary && (
          <TabItem
            to="/library"
            label={fa ? "کتابخانه" : "Library"}
            active={isLibrary}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 4h3l1 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                <path d="M9 12h8" />
              </svg>
            }
          />
        )}
        <TabItem
          to="/account"
          label={fa ? "حساب" : "Account"}
          active={isAccount}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
            </svg>
          }
        />
      </ul>
    </nav>
  );
}

function TabItem({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        to={to as any}
        preload="intent"
        className={`group relative flex h-14 w-full flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition-colors ${
          active ? "text-cream-bright" : "text-cream/55 active:text-cream"
        }`}
        aria-current={active ? "page" : undefined}
      >
        {/* Single, calm amber dot above active icon */}
        <span
          className={`pointer-events-none absolute top-0 h-[3px] w-[3px] rounded-full bg-amber transition-opacity duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        />
        <span className="relative flex h-[26px] w-[44px] items-center justify-center">
          <span className="relative h-[20px] w-[20px]">{icon}</span>
        </span>
        <span className="leading-none">{label}</span>
      </Link>
    </li>
  );
}
