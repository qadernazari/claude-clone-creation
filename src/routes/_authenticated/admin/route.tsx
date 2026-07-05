import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/admin.functions";
import {
  LayoutDashboard, Film, LogOut, Home, Users, Receipt, Settings, Globe,
} from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
  },
  component: AdminGate,
});

function AdminGate() {
  const checkAdmin = useServerFn(requireAdmin);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-role-check"],
    queryFn: () => checkAdmin(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  if (!data?.isAdmin) {
    return <AccessDenied onRetry={() => refetch()} isRetrying={isFetching} />;
  }

  return <AdminShell />;
}

function AccessDenied({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  const { user } = useAuthState();
  const email = user?.email ?? "you@example.com";
  const userId = user?.id ?? "";
  const [copied, setCopied] = useState<string | null>(null);

  const sql = `insert into public.user_roles (user_id, role)\nselect id, 'admin' from auth.users where email = '${email}'\non conflict (user_id, role) do nothing;`;

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success("Copied");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card/40 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber/15 grid place-items-center">
            <ShieldAlert className="h-5 w-5 text-amber" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Access denied</h1>
            <p className="text-xs text-muted-foreground">Your account doesn't have the admin role.</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/50 p-3 text-xs space-y-1 mb-5">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Signed in as</span>
            <span className="font-mono truncate">{email}</span>
          </div>
          {userId && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">User ID</span>
              <button
                type="button"
                onClick={() => copy("id", userId)}
                className="font-mono truncate hover:text-foreground inline-flex items-center gap-1"
                title="Copy"
              >
                <span className="truncate">{userId}</span>
                <Copy className="h-3 w-3 shrink-0" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium">To grant yourself admin access:</p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Open your backend SQL editor.</li>
            <li>
              Run the query below (it targets <span className="font-mono text-foreground">{email}</span>).
            </li>
            <li>Come back here and click <span className="text-foreground">Re-check access</span>.</li>
          </ol>

          <div className="relative rounded-md border border-border bg-black/40">
            <pre className="p-3 pr-12 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{sql}</pre>
            <button
              type="button"
              onClick={() => copy("sql", sql)}
              className="absolute top-2 right-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Copy SQL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {copied === "sql" && (
              <div className="absolute top-2 right-10 text-[10px] text-amber">Copied</div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            If someone else manages this site, ask them to run the query above for your email.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <Button onClick={onRetry} disabled={isRetrying} size="sm">
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            Re-check access
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/">Back to site</Link>
          </Button>
          <Button onClick={signOut} variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

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
