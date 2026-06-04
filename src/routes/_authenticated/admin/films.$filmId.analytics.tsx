import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, Ticket as TicketIcon, HeartHandshake, Clock } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";
import { capitalize } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/films/$filmId/analytics")({
  component: FilmAnalyticsPage,
});

async function loadAll(filmId: string) {
  const [film, events, tickets, contribs, profiles] = await Promise.all([
    supabase.from("films").select("id, slug, title_en, title_fa").eq("id", filmId).maybeSingle(),
    supabase.from("events").select("id, type, country, created_at").eq("film_id", filmId).order("created_at", { ascending: false }).limit(2000),
    supabase.from("tickets").select("id, status, amount, currency, paid_at, created_at, user_id, provider").eq("film_id", filmId).order("created_at", { ascending: false }),
    supabase.from("contributions").select("id, status, amount, currency, paid_at, created_at, user_id, provider, supporter").eq("film_id", filmId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name"),
  ]);
  if (film.error) throw new Error(film.error.message);
  const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return {
    film: film.data,
    events: events.data ?? [],
    tickets: tickets.data ?? [],
    contributions: contribs.data ?? [],
    profiles: profileMap,
  };
}

function FilmAnalyticsPage() {
  const { filmId } = Route.useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "film-analytics", filmId], queryFn: () => loadAll(filmId) });

  const stats = useMemo(() => {
    const ev = data?.events ?? [];
    const t = data?.tickets ?? [];
    const c = data?.contributions ?? [];
    const views = ev.filter((e) => e.type === "view").length;
    const completes = ev.filter((e) => e.type === "complete").length;
    const ticketRev = t.filter((x) => x.status === "paid" && x.currency === "usd").reduce((s, x) => s + x.amount, 0);
    const ticketTom = t.filter((x) => x.status === "paid" && x.currency === "toman").reduce((s, x) => s + x.amount, 0);
    const contribRev = c.filter((x) => x.status === "paid" && x.currency === "usd").reduce((s, x) => s + x.amount, 0);
    const completion = views > 0 ? Math.round((completes / views) * 100) : 0;
    return { views, completes, completion, ticketRev, ticketTom, contribRev, ticketsCount: t.length, contribsCount: c.length };
  }, [data]);

  const countries = useMemo(() => {
    const ev = data?.events ?? [];
    const counts = new Map<string, number>();
    for (const e of ev) {
      const k = e.country || "Unknown";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [data]);

  const chart = useMemo(() => {
    const ev = data?.events?.filter((e) => e.type === "view") ?? [];
    const days = 28;
    const buckets: { day: string; count: number }[] = [];
    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      const key = date.toISOString().slice(0, 10);
      buckets.push({ day: key, count: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.day, i]));
    for (const e of ev) {
      const k = e.created_at.slice(0, 10);
      if (idx.has(k)) buckets[idx.get(k)!].count++;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max };
  }, [data]);

  type Txn = { kind: "ticket" | "support"; id: string; who: string; amount: number; currency: string; provider: string | null; status: string; date: string };
  const transactions: Txn[] = useMemo(() => {
    if (!data) return [];
    const out: Txn[] = [];
    for (const t of data.tickets) {
      const p = data.profiles.get(t.user_id);
      out.push({
        kind: "ticket", id: t.id, who: p?.full_name || p?.email || t.user_id.slice(0, 8),
        amount: t.amount, currency: t.currency, provider: t.provider, status: t.status, date: t.created_at,
      });
    }
    for (const c of data.contributions) {
      const p = c.user_id ? data.profiles.get(c.user_id) : null;
      out.push({
        kind: "support", id: c.id, who: p?.full_name || p?.email || c.supporter || "Anonymous",
        amount: c.amount, currency: c.currency, provider: c.provider, status: c.status, date: c.created_at,
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!data?.film) return <div className="p-8 text-muted-foreground">Film not found.</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-4">
        <Link to="/admin/films" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Films
        </Link>
      </div>
      <PageHeader title={data.film.title_en} subtitle="Per-film performance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Eye className="h-4 w-4" />} label="Views" value={stats.views.toLocaleString()} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Completion" value={`${stats.completion}%`} />
        <StatCard icon={<TicketIcon className="h-4 w-4" />} label="Ticket revenue (USD)" value={`$${(stats.ticketRev / 100).toFixed(2)}`} />
        <StatCard icon={<HeartHandshake className="h-4 w-4" />} label="Support (USD)" value={`$${(stats.contribRev / 100).toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Views over time</h3>
            <span className="text-xs text-muted-foreground">Last 28 days</span>
          </div>
          <div className="flex items-end gap-0.5 h-28">
            {chart.buckets.map((b) => (
              <div key={b.day} className="flex-1 bg-primary/40 hover:bg-primary/60 rounded-sm transition-colors" style={{ height: `${(b.count / chart.max) * 100}%` }} title={`${b.day}: ${b.count}`} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-5">
          <h3 className="font-medium mb-4">Top countries</h3>
          {countries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No country data yet.</p>
          ) : (
            <ul className="space-y-2">
              {countries.map(([country, count]) => {
                const pct = Math.round((count / countries[0][1]) * 100);
                return (
                  <li key={country} className="flex items-center gap-3 text-sm">
                    <span className="w-24 truncate">{country}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular-nums text-muted-foreground text-xs w-12 text-right">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium">All transactions for this film</h3>
          <span className="text-xs text-muted-foreground">{transactions.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Buyer / Supporter</th>
              <th className="px-4 py-3 w-24">Type</th>
              <th className="px-4 py-3 w-28">Amount</th>
              <th className="px-4 py-3 w-28">Method</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-32">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions yet.</td></tr>
            )}
            {transactions.map((t) => (
              <tr key={`${t.kind}-${t.id}`}>
                <td className="px-4 py-3">{t.who}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${t.kind === "ticket" ? "bg-primary/15 text-primary" : "bg-rose-500/15 text-rose-400"}`}>
                    {capitalize(t.kind)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {t.currency === "usd" ? `$${(t.amount / 100).toFixed(2)}` : `${t.amount.toLocaleString()} ${t.currency.toUpperCase()}`}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{t.provider ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{t.status}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(t.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
