import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/admin.functions";
import {
  LayoutDashboard, Film, LogOut, Home, Users, Receipt, Settings, Globe,
} from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    try {
      const res = await requireAdmin();
      if (!res.isAdmin) throw redirect({ to: "/" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as Record<string, unknown>)) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: AdminShell,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

// One flat, focused nav. Daily-use items only.
// Less-used pages (categories, banner, menu, appearance, footer, FAQ, pages,
// trial analytics, contact inbox, subscribers, coupons, support, contributions)
// remain reachable by URL but are intentionally not listed here to reduce noise.
const NAV: ReadonlyArray<NavItem> = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/films", label: "Films", icon: Film },
  { to: "/admin/tickets", label: "Sales & tickets", icon: Receipt },
  { to: "/admin/users", label: "Members", icon: Users },
  { to: "/admin/homepage", label: "Site content", icon: Globe },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/admin" className="inline-flex items-center gap-2">
            <Logo size={28} />
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto space-y-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            View site
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
