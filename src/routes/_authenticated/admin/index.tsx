import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Film, Users, Ticket, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

async function getCounts() {
  const [films, profiles, tickets, contributions] = await Promise.all([
    supabase.from("films").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase
      .from("contributions")
      .select("amount", { count: "exact" })
      .eq("status", "paid"),
  ]);
  const contribTotal = (contributions.data ?? []).reduce(
    (sum, row) => sum + Number((row as { amount: number }).amount ?? 0),
    0,
  );
  return {
    films: films.count ?? 0,
    profiles: profiles.count ?? 0,
    tickets: tickets.count ?? 0,
    contributionsCount: contributions.count ?? 0,
    contributionsTotalCents: contribTotal,
  };
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: getCounts,
  });

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of the platform.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Films" value={data?.films} icon={Film} loading={isLoading} />
        <Stat label="Users" value={data?.profiles} icon={Users} loading={isLoading} />
        <Stat label="Paid tickets" value={data?.tickets} icon={Ticket} loading={isLoading} />
        <Stat
          label="Contributions"
          value={data?.contributionsCount}
          sub={
            data
              ? `$${(data.contributionsTotalCents / 100).toFixed(2)} total`
              : undefined
          }
          icon={Heart}
          loading={isLoading}
        />
      </div>

      <section className="mt-10 rounded-lg border border-border bg-card/40 p-6">
        <h2 className="text-sm font-medium text-foreground">Next steps</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Add your first films in <span className="text-foreground">Films</span>.</li>
          <li>• Manage categories used to group films.</li>
          <li>• Payments (ticket purchase + contributions) will be wired in the next chunk.</li>
        </ul>
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
}: {
  label: string;
  value?: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        {loading ? "…" : value ?? 0}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
