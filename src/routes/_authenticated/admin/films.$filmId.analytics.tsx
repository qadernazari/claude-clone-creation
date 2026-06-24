import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Eye,
  Users,
  Clock,
  Activity,
  Ticket as TicketIcon,
  HeartHandshake,
  DollarSign,
  Crown,
  Sparkles,
  Globe2,
  BarChart3,
  MapPin,
  MonitorSmartphone,
} from "lucide-react";
import { capitalize } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/films/$filmId/analytics")({
  component: FilmAnalyticsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 max-w-2xl">
      <Link to="/admin/films" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Films
      </Link>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h1 className="font-medium text-destructive mb-1">Couldn't open film analytics</h1>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "The analytics page could not be rendered."}</p>
      </div>
    </div>
  ),
});

async function loadAll(filmId: string) {
  const [film, events, tickets, contribs, progress, profiles] = await Promise.all([
    supabase.from("films").select("id, slug, title_en, title_fa, cover_url, thumbnail_url, poster_gradient, access_type, is_premium, duration_min").eq("id", filmId).maybeSingle(),
    supabase.from("events").select("id, type, value, country, city, region, device_type, os, browser, referrer_source, referrer_host, session_id, created_at").eq("film_id", filmId).order("created_at", { ascending: false }).limit(5000),
    supabase.from("tickets").select("id, status, amount, currency, paid_at, created_at, user_id, provider").eq("film_id", filmId).order("created_at", { ascending: false }),
    supabase.from("contributions").select("id, status, amount, currency, paid_at, created_at, user_id, provider, supporter").eq("film_id", filmId).order("created_at", { ascending: false }),
    supabase.from("watch_progress").select("user_id, position_seconds, duration_seconds, completed, updated_at").eq("film_id", filmId),
    supabase.from("profiles").select("id, email, full_name"),
  ]);
  for (const result of [film, events, tickets, contribs, progress, profiles]) {
    if (result.error) throw new Error(result.error.message);
  }
  const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return {
    film: film.data,
    events: events.data ?? [],
    tickets: tickets.data ?? [],
    contributions: contribs.data ?? [],
    progress: progress.data ?? [],
    profiles: profileMap,
  };
}

type Range = "7d" | "30d" | "90d" | "all";
const RANGES: { key: Range; label: string; days: number | null }[] = [
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "all", label: "All time", days: null },
];

function FilmAnalyticsPage() {
  const { filmId } = Route.useParams();
  const [range, setRange] = useState<Range>("30d");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "film-analytics", filmId],
    queryFn: () => loadAll(filmId),
  });

  const cutoff = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    if (!r?.days) return 0;
    return Date.now() - r.days * 86400000;
  }, [range]);

  const inRange = (iso: string) => !cutoff || new Date(iso).getTime() >= cutoff;

  const stats = useMemo(() => {
    const ev = (data?.events ?? []).filter((e) => inRange(e.created_at));
    const tk = (data?.tickets ?? []).filter((t) => inRange(t.created_at));
    const co = (data?.contributions ?? []).filter((c) => inRange(c.created_at));
    const wp = data?.progress ?? [];

    const views = ev.filter((e) => e.type === "view").length;
    const completes = ev.filter((e) => e.type === "complete").length;
    const sessions = new Set(ev.map((e) => e.session_id).filter(Boolean) as string[]);
    const progressUsers = new Set(wp.map((p) => p.user_id).filter(Boolean) as string[]);
    const uniqueViewers = sessions.size || progressUsers.size || views;

    const watchSeconds = wp.reduce((s, p) => s + (p.position_seconds || 0), 0);
    const avgWatchSeconds = wp.length ? Math.round(watchSeconds / wp.length) : 0;
    const completedCount = wp.filter((p) => p.completed).length;
    const completion = views > 0
      ? Math.round((completes / views) * 100)
      : (wp.length ? Math.round((completedCount / wp.length) * 100) : 0);

    const paidTickets = tk.filter((t) => t.status === "paid");
    const paidContribs = co.filter((c) => c.status === "paid");
    const ticketRevUsd = paidTickets.filter((t) => t.currency === "usd").reduce((s, t) => s + t.amount, 0);
    const ticketRevToman = paidTickets.filter((t) => t.currency === "toman").reduce((s, t) => s + t.amount, 0);
    const contribRevUsd = paidContribs.filter((c) => c.currency === "usd").reduce((s, c) => s + c.amount, 0);
    const contribRevToman = paidContribs.filter((c) => c.currency === "toman").reduce((s, c) => s + c.amount, 0);

    return {
      views, completes, uniqueViewers, completion,
      watchSeconds, avgWatchSeconds,
      continueWatching: wp.filter((p) => !p.completed && (p.position_seconds || 0) > 15).length,
      uniqueViewersEstimated: sessions.size === 0 && progressUsers.size === 0 && views > 0,
      ppvCount: paidTickets.length,
      contribCount: paidContribs.length,
      ticketRevUsd, ticketRevToman, contribRevUsd, contribRevToman,
      totalRevUsd: ticketRevUsd + contribRevUsd,
      totalRevToman: ticketRevToman + contribRevToman,
    };
  }, [data, cutoff]);

  function topN<T extends string | null | undefined>(values: T[], n = 10, fallback = "Unavailable") {
    const counts = new Map<string, number>();
    for (const v of values) {
      const k = (v && String(v).trim()) || fallback;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  const filteredEvents = useMemo(
    () => (data?.events ?? []).filter((e) => inRange(e.created_at)),
    [data, cutoff],
  );

  const countries = useMemo(() => topN(filteredEvents.map((e) => (e as any).country as string | null)), [filteredEvents]);
  const cities = useMemo(() => topN(filteredEvents.map((e) => {
    const c = (e as any).city as string | null;
    const co = (e as any).country as string | null;
    return c ? (co ? `${c}, ${co}` : c) : null;
  })), [filteredEvents]);
  const devices = useMemo(() => topN(filteredEvents.map((e) => (e as any).device_type as string | null)), [filteredEvents]);
  const oses = useMemo(() => topN(filteredEvents.map((e) => (e as any).os as string | null)), [filteredEvents]);
  const browsers = useMemo(() => topN(filteredEvents.map((e) => (e as any).browser as string | null)), [filteredEvents]);
  const sources = useMemo(() => topN(filteredEvents.map((e) => (e as any).referrer_source as string | null)), [filteredEvents]);

  const trend = useMemo(() => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const buckets: { day: string; count: number }[] = [];
    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      buckets.push({ day: date.toISOString().slice(0, 10), count: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.day, i]));
    for (const e of data?.events ?? []) {
      if (e.type !== "view") continue;
      const k = e.created_at.slice(0, 10);
      if (idx.has(k)) buckets[idx.get(k)!].count++;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max, days };
  }, [data, range]);

  type Txn = { kind: "ticket" | "support"; id: string; who: string; amount: number; currency: string; provider: string | null; status: string; date: string };
  const transactions: Txn[] = useMemo(() => {
    if (!data) return [];
    const out: Txn[] = [];
    for (const t of data.tickets.filter((x) => inRange(x.created_at))) {
      const p = data.profiles.get(t.user_id);
      out.push({ kind: "ticket", id: t.id, who: p?.full_name || p?.email || t.user_id.slice(0, 8), amount: t.amount, currency: t.currency, provider: t.provider, status: t.status, date: t.created_at });
    }
    for (const c of data.contributions.filter((x) => inRange(x.created_at))) {
      const p = c.user_id ? data.profiles.get(c.user_id) : null;
      out.push({ kind: "support", id: c.id, who: p?.full_name || p?.email || c.supporter || "Anonymous", amount: c.amount, currency: c.currency, provider: c.provider, status: c.status, date: c.created_at });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [data, cutoff]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading analytics…</div>;
  if (error) return (
    <div className="p-8 max-w-2xl">
      <Link to="/admin/films" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Films
      </Link>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="font-medium text-destructive mb-1">Couldn't load analytics</h2>
        <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-accent">Retry</button>
      </div>
    </div>
  );
  if (!data?.film) return (
    <div className="p-8 max-w-2xl">
      <Link to="/admin/films" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Films
      </Link>
      <div className="rounded-lg border border-border bg-card/40 p-6 text-muted-foreground">Film not found.</div>
    </div>
  );

  const totallyEmpty =
    (data.events.length === 0) &&
    (data.tickets.length === 0) &&
    (data.contributions.length === 0) &&
    (data.progress.length === 0);

  const film = data.film;
  const accessType = (film as any).access_type as string;
  const isPremium = (film as any).is_premium as boolean;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/admin/films" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Films
        </Link>
        <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <FilmHero film={film} />

      {totallyEmpty ? (
        <div className="rounded-lg border border-border bg-card/40 p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-medium mb-1">No analytics data available for this film yet.</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Views, watch time, purchases and contributions will appear here once viewers start
            interacting with this film.
          </p>
        </div>
      ) : (
        <>
          {/* Engagement */}
          <SectionHeader title="Engagement" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<Eye className="h-4 w-4" />} label="Total views" value={stats.views.toLocaleString()} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Unique viewers" value={stats.uniqueViewers.toLocaleString()} hint={stats.uniqueViewersEstimated ? "Estimated from view events" : undefined} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Total watch time" value={formatDuration(stats.watchSeconds)} />
            <StatCard icon={<Activity className="h-4 w-4" />} label="Avg. watch duration" value={formatDuration(stats.avgWatchSeconds)} />
            <StatCard icon={<Activity className="h-4 w-4" />} label="Completion rate" value={`${stats.completion}%`} />
            <StatCard icon={<Eye className="h-4 w-4" />} label="Completes" value={stats.completes.toLocaleString()} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Continue watching" value={stats.continueWatching.toLocaleString()} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Film length" value={film.duration_min ? `${film.duration_min} min` : "—"} />
          </div>

          {/* Monetization */}
          <SectionHeader title="Monetization" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<Crown className="h-4 w-4" />} label="Membership views"
              value={accessType === "membership" || accessType === "membership_or_ppv" ? stats.views.toLocaleString() : "—"}
              hint={accessType === "ppv_only" || accessType === "free" ? "Not membership-gated" : undefined} />
            <StatCard icon={<TicketIcon className="h-4 w-4" />} label="Pay-per-view purchases" value={stats.ppvCount.toLocaleString()} />
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Premium purchases"
              value={isPremium ? stats.ppvCount.toLocaleString() : "—"}
              hint={!isPremium ? "Not flagged as premium" : undefined} />
            <StatCard icon={<HeartHandshake className="h-4 w-4" />} label="Support contributions" value={stats.contribCount.toLocaleString()} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Ticket revenue (USD)" value={`$${(stats.ticketRevUsd / 100).toFixed(2)}`} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Support revenue (USD)" value={`$${(stats.contribRevUsd / 100).toFixed(2)}`} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total revenue (USD)" value={`$${(stats.totalRevUsd / 100).toFixed(2)}`} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total revenue (تومان)"
              value={stats.totalRevToman > 0 ? stats.totalRevToman.toLocaleString() : "—"} />
          </div>

          {/* Trend + Geography */}
          <SectionHeader title="Trends & audience" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border border-border bg-card/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Views over time</h3>
                <span className="text-xs text-muted-foreground">Last {trend.days} days</span>
              </div>
              {stats.views === 0 ? (
                <EmptyMini text="No views in this range yet." />
              ) : (
                <div className="flex items-end gap-0.5 h-28">
                  {trend.buckets.map((b) => (
                    <div key={b.day} className="flex-1 bg-primary/40 hover:bg-primary/70 rounded-sm transition-colors"
                      style={{ height: `${Math.max(2, (b.count / trend.max) * 100)}%` }}
                      title={`${b.day}: ${b.count}`} />
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-5">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Globe2 className="h-4 w-4" /> Top countries</h3>
              {countries.length === 0 ? (
                <EmptyMini text="No country data captured yet." />
              ) : (
                <ul className="space-y-2">
                  {countries.map(([country, count]) => {
                    const pct = Math.round((count / countries[0][1]) * 100);
                    return (
                      <li key={country} className="flex items-center gap-3 text-sm">
                        <span className="w-28 truncate">{country}</span>
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

          {/* Geo / Device / Traffic breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BreakdownCard icon={<MapPin className="h-4 w-4" />} title="Top cities" rows={cities} emptyText="No city data captured yet." />
            <BreakdownCard icon={<Globe2 className="h-4 w-4" />} title="Traffic sources" rows={sources} emptyText="No referrer data captured yet." />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <BreakdownCard icon={<MonitorSmartphone className="h-4 w-4" />} title="Devices" rows={devices} emptyText="No device data captured yet." />
            <BreakdownCard icon={<MonitorSmartphone className="h-4 w-4" />} title="Operating systems" rows={oses} emptyText="No OS data captured yet." />
            <BreakdownCard icon={<MonitorSmartphone className="h-4 w-4" />} title="Browsers" rows={browsers} emptyText="No browser data captured yet." />
          </div>

          {/* Transactions */}
          <SectionHeader title="Transactions" />
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
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions in this range yet.</td></tr>
                )}
                {transactions.map((t) => (
                  <tr key={`${t.kind}-${t.id}`}>
                    <td className="px-4 py-3">{t.who}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-md px-2 py-0.5 ${t.kind === "ticket" ? "bg-primary/15 text-primary" : "bg-rose-500/15 text-rose-400"}`}>
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
        </>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-2">{title}</h2>;
}

function FilmHero({ film }: { film: { title_en: string; title_fa: string | null; cover_url: string | null; thumbnail_url: string | null; poster_gradient: string | null; duration_min: number | null; access_type: string; is_premium: boolean } }) {
  const poster = film.cover_url || film.thumbnail_url;
  return (
    <header className="mb-6 rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="flex items-center gap-4">
        {poster ? (
          <img src={poster} alt={`${film.title_en} poster`} className="h-24 w-16 shrink-0 rounded-md object-cover ring-1 ring-border" />
        ) : (
          <div className="h-24 w-16 shrink-0 rounded-md ring-1 ring-border" style={{ background: film.poster_gradient ?? "var(--muted)" }} />
        )}
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Film analytics</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{film.title_en}</h1>
          {film.title_fa && <p className="mt-1 text-sm text-muted-foreground" dir="rtl">{film.title_fa}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-0.5">{capitalize(film.access_type.replaceAll("_", " "))}</span>
            {film.is_premium && <span className="rounded-md bg-primary/15 px-2 py-0.5 text-primary">Premium</span>}
            <span className="rounded-md bg-muted px-2 py-0.5">{film.duration_min ? `${film.duration_min} min` : "Duration not set"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span className="truncate">{label}</span></div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground/70 mt-1">{hint}</div>}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}

function BreakdownCard({ icon, title, rows, emptyText }: { icon: React.ReactNode; title: string; rows: [string, number][]; emptyText: string }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="rounded-lg border border-border bg-card/40 p-5">
      <h3 className="font-medium mb-4 flex items-center gap-2">{icon} {title}</h3>
      {rows.length === 0 ? (
        <EmptyMini text={emptyText} />
      ) : (
        <ul className="space-y-2">
          {rows.map(([label, count]) => {
            const pct = Math.round((count / max) * 100);
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate" title={label}>{label}</span>
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
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
