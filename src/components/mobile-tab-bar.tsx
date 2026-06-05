import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { useCurrentUserState } from "@/hooks/use-subscription";

/**
 * Native-app-style bottom tab bar for mobile.
 * Visible only on small screens (<md). Hidden on the immersive
 * watch player and on auth routes to maximize content.
 */
export function MobileTabBar() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const location = useLocation();
  const { user } = useCurrentUserState();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(!!user);
  }, [user]);

  // Hide on immersive / fullscreen routes
  const path = location.pathname;
  const hidden =
    path.startsWith("/watch/") ||
    path.startsWith("/auth") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/checkout") ||
    path.startsWith("/admin") ||
    path.startsWith("/_authenticated/admin");

  if (hidden) return null;

  const accountTarget = signedIn ? "/account" : "/auth";

  const isActive = (key: "home" | "browse" | "search" | "account") => {
    if (key === "home") return path === "/";
    if (key === "browse") return path === "/browse" && !location.search?.toString().includes("q=");
    if (key === "search") return path === "/browse" && location.search?.toString().includes("q=");
    if (key === "account")
      return (
        path.startsWith("/account") ||
        path.startsWith("/library") ||
        path.startsWith("/my-tickets") ||
        path === "/auth"
      );
    return false;
  };

  return (
    <nav
      aria-label={fa ? "ناوبری" : "Primary"}
      dir={fa ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream/[0.08] bg-bg-0/85 backdrop-blur-xl md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        <TabItem
          to="/"
          label={fa ? "خانه" : "Home"}
          active={isActive("home")}
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
          active={isActive("browse")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="7" height="7" rx="1.4" />
              <rect x="14" y="4" width="7" height="7" rx="1.4" />
              <rect x="3" y="13" width="7" height="7" rx="1.4" />
              <rect x="14" y="13" width="7" height="7" rx="1.4" />
            </svg>
          }
        />
        <TabItem
          to="/browse"
          search={{ q: "" } as any}
          label={fa ? "جستجو" : "Search"}
          active={isActive("search")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          }
        />
        <TabItem
          to={accountTarget}
          label={fa ? "حساب" : "Account"}
          active={isActive("account")}
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
  search,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  search?: any;
}) {
  // Sign-out / sign-out behaviour: only handle the click for the search tab to
  // make sure tapping it twice clears the query.
  return (
    <li className="flex-1">
      <Link
        to={to as any}
        search={search}
        className={`group relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium tracking-wide transition-colors ${
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

/**
 * Logout helper used elsewhere; kept here for co-location with the tab bar.
 */
export async function signOutFromMobile() {
  await supabase.auth.signOut();
}
