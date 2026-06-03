import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, PlayCircle, CheckCircle2, Ticket, Heart, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

type Range = 7 | 30 | 90;

type EventRow = { type: string; film_id: string | null; created_at: string };
type TicketRow = { film_id: string; amount: number; currency: string; paid_at: string };
type ContribRow = { amount: number; currency: string; paid_at: string };
type FilmRow = { id: string; title_en: string };

function sinceISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function loadAnalytics(days: Range) {
  const since = sinceISO(days);
  const [eventsRes, ticketsRes, contribsRes, filmsRes] = await Promise.all([
    supabase
      .from("events")
      .select("type, film_id, created_at")
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("tickets")
      .select("film_id, amount, currency, paid_at")
      .eq("status", "paid")
      .gte("paid_at", since)
      .limit(5000),
    supabase
      .from("contributions")
      .select("amount, currency, paid_at")
      .eq("status", "paid")
      .gte("paid_at", since)
      .limit(5000),
    supabase.from("films").select("id, title_en"),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (ticketsRes.error) throw new Error(ticketsRes.error.message);
  if (contribsRes.error) throw new Error(contribsRes.error.message);
  if (filmsRes.error) throw new Error(filmsRes.error.message);

  return {
    events: (eventsRes.data ?? []) as EventRow[],
    tickets: (ticketsRes.data ?? []) as TicketRow[],
    contributions: (contribsRes.data ?? []) as ContribRow[],
    films: (filmsRes.data ?? []) as FilmRow[],
  };
}

function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "analytics", range],
    queryFn: () => loadAnalytics(range),
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const views = data.events.filter((e) => e.type === "view").length;
    const progress = data.events.filter((e) => e.type === "progress").length;
    const completes = data.events.filter((e) => e.type === "complete").length;

    const ticketsCountUsd = data.tickets.filter((t) => t.currency === "usd").length;
    const ticketsCountToman = data.tickets.filter((t) => t.currency === "toman").length;
    const ticketRevenueCents = data.tickets
      .filter((t) => t.currency === "usd")
      .reduce((s, t) => s + Number(t.amount), 0);
    const ticketRevenueToman = data.tickets
      .filter((t) => t.currency === "toman")
      .reduce((s, t) => s + Number(t.amount), 0);

    const contribRevenueCents = data.contributions
      .filter((c) => c.currency === "usd")
      .reduce((s, c) => s + Number(c.amount), 0);
    const contribCount = data.contributions.length;

    return {
      views,
      progress,
      completes,
      ticketsCount: data.tickets.length,
      ticketsCountUsd,
      ticketsCountToman,
      ticketRevenueCents,
      ticketRevenueToman,
      contribCount,
      contribRevenueCents,
    };
  }, [data]);

  const topFilms = useMemo(() => {
    if (!data) return [];
    const filmName = new Map(data.films.map((f) => [f.id, f.title_en]));
    const stats = new Map<
      string,
      { views: number; completes: number; tickets: number; revenueCents: number }
    >();
    const ensure = (id: string) => {
      if (!stats.has(id)) stats.set(id, { views: 0, completes: 0, tickets: 0, revenueCents: 0 });
      return stats.get(id)!;
    };
    for (const e of data.events) {
      if (!e.film_id) continue;
      const s = ensure(e.film_id);
      if (e.type === "view") s.views++;
      if (e.type === "complete") s.completes++;
    }
    for (const t of data.tickets) {
      const s = ensure(t.film_id);
      s.tickets++;
      if (t.currency === "usd") s.revenueCents += Number(t.amount);
    }
    return Array.from(stats.entries())
      .map(([id, s]) => ({
        id,
        name: filmName.get(id) ?? "Unknown film",
        ...s,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [data]);

  const dailyViews = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<string, number>();
    for (let i = 0; i < range; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (range - 1 - i));
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const e of data.events) {
      if (e.type !== "view") continue;
      const k = e.created_at.slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
  }, [data, range]);

  const maxDaily = Math.max(1, ...dailyViews.map((d) => d.count));

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {range} days of activity across the platform.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat icon={Eye} label="Views" value={summary?.views} loading={isLoading} />
        <Stat icon={PlayCircle} label="Progress events" value={summary?.progress} loading={isLoading} />
        <Stat icon={CheckCircle2} label="Completes" value={summary?.completes} loading={isLoading} />
        <Stat
          icon={Ticket}
          label="Paid tickets"
          value={summary?.ticketsCount}
          sub={
            summary
              ? `$${(summary.ticketRevenueCents / 100).toFixed(2)}${
                  summary.ticketRevenueToman > 0
                    ? ` · ${summary.ticketRevenueToman.toLocaleString()} T`
                    : ""
                }`
              : undefined
          }
          loading={isLoading}
        />
        <Stat
          icon={Heart}
          label="Contributions"
          value={summary?.contribCount}
          sub={summary ? `$${(summary.contribRevenueCents / 100).toFixed(2)} total` : undefined}
          loading={isLoading}
        />
        <Stat
          icon={TrendingUp}
          label="Completion rate"
          value={
            summary && summary.views > 0
              ? Math.round((summary.completes / summary.views) * 100)
              : 0
          }
          sub="% of views"
          loading={isLoading}
        />
      </div>

      <section className="mt-8 rounded-lg border border-border bg-card/40 p-5">
        <h2 className="text-sm font-medium">Views per day</h2>
        <div className="mt-4 flex items-end gap-1 h-40">
          {dailyViews.map(({ day, count }) => (
            <div
              key={day}
              className="flex-1 flex flex-col items-center justify-end gap-1 group"
              title={`${day}: ${count}`}
            >
              <div
                className="w-full rounded-t bg-primary/80 group-hover:bg-primary transition-colors"
                style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{dailyViews[0]?.day}</span>
          <span>{dailyViews[dailyViews.length - 1]?.day}</span>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border overflow-hidden">
        <header className="px-4 py-3 bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
          Top films
        </header>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-2">Film</th>
              <th className="px-4 py-2 w-24 text-right">Views</th>
              <th className="px-4 py-2 w-28 text-right">Completes</th>
              <th className="px-4 py-2 w-24 text-right">Tickets</th>
              <th className="px-4 py-2 w-28 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && topFilms.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                No activity in this period yet.
              </td></tr>
            )}
            {topFilms.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3">{f.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{f.views}</td>
                <td className="px-4 py-3 text-right tabular-nums">{f.completes}</td>
                <td className="px-4 py-3 text-right tabular-nums">{f.tickets}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  ${(f.revenueCents / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        {loading ? "…" : (value ?? 0).toLocaleString()}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
