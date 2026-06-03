import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Film,
  Users,
  Ticket,
  Heart,
  ArrowUpRight,
  Plus,
  Tag,
  BarChart3,
  Mail,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

type Counts = {
  films: number;
  publishedFilms: number;
  profiles: number;
  newProfiles7d: number;
  paidTickets: number;
  paidTickets7d: number;
  contributionsCount: number;
  contributionsTotalCents: number;
  views7d: number;
  notifySubscribers: number;
};

async function getCounts(): Promise<Counts> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    films,
    publishedFilms,
    profiles,
    newProfiles,
    paidTickets,
    paidTickets7d,
    contributions,
    views,
    notify,
  ] = await Promise.all([
    supabase.from("films").select("*", { count: "exact", head: true }),
    supabase
      .from("films")
      .select("*", { count: "exact", head: true })
      .eq("visibility", "published"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid"),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("contributions")
      .select("amount", { count: "exact" })
      .eq("status", "paid"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("type", "view")
      .gte("created_at", sevenDaysAgo),
    supabase.from("notify_list").select("*", { count: "exact", head: true }),
  ]);
  const contribTotal = (contributions.data ?? []).reduce(
    (sum, row) => sum + Number((row as { amount: number }).amount ?? 0),
    0,
  );
  return {
    films: films.count ?? 0,
    publishedFilms: publishedFilms.count ?? 0,
    profiles: profiles.count ?? 0,
    newProfiles7d: newProfiles.count ?? 0,
    paidTickets: paidTickets.count ?? 0,
    paidTickets7d: paidTickets7d.count ?? 0,
    contributionsCount: contributions.count ?? 0,
    contributionsTotalCents: contribTotal,
    views7d: views.count ?? 0,
    notifySubscribers: notify.count ?? 0,
  };
}

type RecentTicket = {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  film: { title_en: string; slug: string } | null;
};

type RecentContribution = {
  id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  supporter: string | null;
};

async function getRecent() {
  const [tickets, contributions] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, amount, currency, created_at, film:films(title_en, slug)")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contributions")
      .select("id, amount, currency, paid_at, supporter")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(5),
  ]);
  return {
    tickets: (tickets.data as unknown as RecentTicket[]) ?? [],
    contributions: (contributions.data as unknown as RecentContribution[]) ?? [],
  };
}

function money(amount: number, currency: string) {
  if (currency === "usd") return `$${(amount / 100).toFixed(2)}`;
  if (currency === "toman") return `${amount.toLocaleString()} T`;
  return `${amount} ${currency.toUpperCase()}`;
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: getCounts,
  });
  const { data: recent } = useQuery({
    queryKey: ["admin", "recent"],
    queryFn: getRecent,
  });

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/films"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            New film
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View site
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Films"
          value={data?.films}
          sub={data ? `${data.publishedFilms} published` : undefined}
          icon={Film}
          loading={isLoading}
          to="/admin/films"
        />
        <Stat
          label="Users"
          value={data?.profiles}
          sub={data && data.newProfiles7d > 0 ? `+${data.newProfiles7d} this week` : "No new this week"}
          icon={Users}
          loading={isLoading}
          to="/admin/users"
        />
        <Stat
          label="Paid tickets"
          value={data?.paidTickets}
          sub={data && data.paidTickets7d > 0 ? `+${data.paidTickets7d} this week` : "No sales this week"}
          icon={Ticket}
          loading={isLoading}
          to="/admin/tickets"
        />
        <Stat
          label="Contributions"
          value={data?.contributionsCount}
          sub={data ? `$${(data.contributionsTotalCents / 100).toFixed(2)} total` : undefined}
          icon={Heart}
          loading={isLoading}
          to="/admin/contributions"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Stat
          label="Views (7d)"
          value={data?.views7d}
          icon={BarChart3}
          loading={isLoading}
          to="/admin/analytics"
        />
        <Stat
          label="Notify subscribers"
          value={data?.notifySubscribers}
          icon={Mail}
          loading={isLoading}
          to="/admin/notify-list"
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card title="Recent tickets" linkTo="/admin/tickets" linkLabel="All tickets">
          {!recent ? (
            <SkeletonRows />
          ) : recent.tickets.length === 0 ? (
            <EmptyRow message="No paid tickets yet." />
          ) : (
            <ul className="divide-y divide-border">
              {recent.tickets.map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground">
                      {t.film?.title_en ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{relTime(t.created_at)}</div>
                  </div>
                  <div className="text-sm tabular-nums text-foreground">
                    {money(t.amount, t.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent contributions" linkTo="/admin/contributions" linkLabel="All contributions">
          {!recent ? (
            <SkeletonRows />
          ) : recent.contributions.length === 0 ? (
            <EmptyRow message="No contributions yet." />
          ) : (
            <ul className="divide-y divide-border">
              {recent.contributions.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground">
                      {c.supporter?.trim() || "Anonymous supporter"}
                    </div>
                    <div className="text-xs text-muted-foreground">{relTime(c.paid_at)}</div>
                  </div>
                  <div className="text-sm tabular-nums text-foreground">
                    {money(c.amount, c.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <ActionTile to="/admin/films" icon={Film} title="Manage films" desc="Edit titles, video, pricing" />
          <ActionTile to="/admin/categories" icon={Tag} title="Categories" desc="Group films by theme" />
          <ActionTile to="/admin/analytics" icon={BarChart3} title="Analytics" desc="Views & engagement" />
          <ActionTile to="/admin/notify-list" icon={Mail} title="Notify list" desc="Email subscribers" />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  to,
}: {
  label: string;
  value?: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
        {loading ? "…" : (value ?? 0).toLocaleString()}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="group rounded-lg border border-border bg-card/40 p-5 transition-colors hover:bg-card/70 hover:border-primary/30"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-lg border border-border bg-card/40 p-5">{body}</div>;
}

function Card({
  title,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  linkTo: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/40">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {linkLabel}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>
      <div className="px-5">{children}</div>
    </section>
  );
}

function ActionTile({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-card/40 p-4 transition-colors hover:bg-card/70 hover:border-primary/30"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="mt-2 text-sm font-medium text-foreground">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function SkeletonRows() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="py-3 flex items-center gap-3">
          <div className="h-3 flex-1 rounded bg-muted/50 animate-pulse" />
          <div className="h-3 w-14 rounded bg-muted/50 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-muted-foreground">{message}</div>
  );
}
