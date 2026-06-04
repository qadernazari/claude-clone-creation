import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/admin.functions";
import {
  LayoutDashboard, Film, Tag, LogOut, Home, Users, Ticket,
  HeartHandshake, Settings, Mail, MessageSquare, TicketPercent,
  Globe, ListTree, FileText, HelpCircle, PanelTop, Megaphone, Palette,
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
      // Re-throw router redirects; otherwise treat as access denied.
      if (e && typeof e === "object" && "to" in (e as Record<string, unknown>)) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: AdminShell,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const MAIN: ReadonlyArray<NavItem> = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/films", label: "Films", icon: Film },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/tickets", label: "Tickets & Sales", icon: Ticket },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/support", label: "Support", icon: HeartHandshake },
  { to: "/admin/notify-list", label: "Subscribers", icon: Mail },
  { to: "/admin/users", label: "Members", icon: Users },
  { to: "/admin/contact-submissions", label: "Contact inbox", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const WEBSITE: ReadonlyArray<NavItem> = [
  { to: "/admin/homepage", label: "Homepage", icon: Globe },
  { to: "/admin/menu", label: "Menu / Navigation", icon: ListTree },
  { to: "/admin/pages", label: "Pages & Text", icon: FileText },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/footer", label: "Footer & Links", icon: PanelTop },
  { to: "/admin/banner", label: "Banner", icon: Megaphone },
  { to: "/admin/appearance", label: "Appearance", icon: Palette },
];

function NavGroup({ label, items, pathname }: { label: string; items: ReadonlyArray<NavItem>; pathname: string }) {
  return (
    <div className="mb-4">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
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
      </div>
    </div>
  );
}

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/admin" className="inline-flex items-center gap-2">
            <Logo size={28} />
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          <NavGroup label="Main" items={MAIN} pathname={pathname} />
          <NavGroup label="Website" items={WEBSITE} pathname={pathname} />
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
