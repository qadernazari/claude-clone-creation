import { useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { useCurrentUserState } from "@/hooks/use-subscription";

/**
 * Native-app-style bottom tab bar for mobile.
 * Visible only on small screens (<md). Hidden on the immersive
 * watch player and on auth / checkout routes to maximize content.
 *
 * Routes:
 *  - Home    → /
 *  - Browse  → /browse  (search input lives at the top of /browse)
 *  - Account → /account if signed in, /auth otherwise
 */
export function MobileTabBar() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const location = useLocation();
  const { user } = useCurrentUserState();

  const path = location.pathname;
  const hidden =
    path.startsWith("/watch/") ||
    path.startsWith("/auth") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/checkout") ||
    path.startsWith("/admin");

  // Tell the body whether to reserve space for the tab bar.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (hidden) document.body.setAttribute("data-no-tabbar", "true");
    else document.body.removeAttribute("data-no-tabbar");
    return () => document.body.removeAttribute("data-no-tabbar");
  }, [hidden]);

  if (hidden) return null;

  const isHome = path === "/";
  const isBrowse = path === "/browse";
  const isAccount =
    path.startsWith("/account") ||
    path === "/auth";

  return (
    <nav
      aria-label={fa ? "ناوبری" : "Primary"}
      dir={fa ? "rtl" : "ltr"}
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-cream/[8%] bg-bg-0/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
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
        {user && (
          <TabItem
            to="/library"
            label={fa ? "کتابخانه" : "Library"}
            active={path.startsWith("/library") || path.startsWith("/my-tickets")}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 4h3l1 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                <path d="M9 12h8" />
              </svg>
            }
          />
        )}
        <TabItem
          to={user ? "/account" : "/auth"}
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
        className={`group relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium tracking-wide transition-colors ${
          active ? "text-cream-bright" : "text-cream/55 active:text-cream"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <span
          className={`h-[22px] w-[22px] transition-transform ${
            active ? "scale-105" : "group-active:scale-95"
          }`}
        >
          {icon}
        </span>
        <span className="leading-none">{label}</span>
        <span
          className={`absolute top-0 h-[2px] w-7 rounded-full bg-amber transition-opacity ${
            active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        />
      </Link>
    </li>
  );
}
