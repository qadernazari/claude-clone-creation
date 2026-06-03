import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeartHandshake, Trophy, Film as FilmIcon, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: SupportPage,
});

type Row = {
  id: string; status: string; amount: number; currency: string;
  supporter: string | null; paid_at: string | null; created_at: string;
  film_id: string | null; user_id: string | null;
};
type FilmMap = Map<string, { slug: string; title_en: string }>;
type ProfileMap = Map<string, { email: string | null; full_name: string | null; avatar_url?: string | null }>;

async function loadAll() {
  const [c, f, p] = await Promise.all([
    supabase.from("contributions").select("id, status, amount, currency, supporter, paid_at, created_at, film_id, user_id").eq("status", "paid").order("created_at", { ascending: false }).limit(1000),
    supabase.from("films").select("id, slug, title_en"),
    supabase.from("profiles").select("id, email, full_name"),
  ]);
  if (c.error) throw new Error(c.error.message);
  const films: FilmMap = new Map((f.data ?? []).map((x) => [x.id, { slug: x.slug, title_en: x.title_en }]));
  const profiles: ProfileMap = new Map((p.data ?? []).map((x) => [x.id, { email: x.email, full_name: x.full_name }]));
  return { rows: (c.data ?? []) as Row[], films, profiles };
}

function fmt(amount: number, currency: string) {
  return currency === "usd"
    ? `$${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${amount.toLocaleString()} ${currency.toUpperCase()}`;
}

function SupportPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "support-impact"], queryFn: loadAll });
  const rows = data?.rows ?? [];
  const films = data?.films;
  const profiles = data?.profiles;

  const stats = useMemo(() => {
    const usd = rows.filter((r) => r.currency === "usd").reduce((s, r) => s + r.amount, 0);
    const toman = rows.filter((r) => r.currency === "toman").reduce((s, r) => s + r.amount, 0);
    const filmSet = new Set(rows.map((r) => r.film_id).filter(Boolean));
    const supporterSet = new Set(rows.map((r) => r.user_id || r.supporter).filter(Boolean));
    return { usd, toman, count: rows.length, films: filmSet.size, supporters: supporterSet.size };
  }, [rows]);

  const topSupporters = useMemo(() => {
    const agg = new Map<string, { key: string; label: string; sublabel: string; usd: number; toman: number; count: number }>();
    for (const r of rows) {
      const key = r.user_id || r.supporter || "anon";
      const profile = r.user_id ? profiles?.get(r.user_id) : null;
      const label = profile?.full_name || profile?.email || r.supporter || "Anonymous";
      const sublabel = profile?.email && profile?.full_name ? profile.email : "";
      const cur = agg.get(key) ?? { key, label, sublabel, usd: 0, toman: 0, count: 0 };
      if (r.currency === "usd") cur.usd += r.amount;
      else if (r.currency === "toman") cur.toman += r.amount;
      cur.count += 1;
      agg.set(key, cur);
    }
    return [...agg.values()]
      .sort((a, b) => (b.usd + b.toman / 100) - (a.usd + a.toman / 100))
      .slice(0, 10);
  }, [rows, profiles]);

  const byFilm = useMemo(() => {
    const agg = new Map<string, { id: string | null; usd: number; toman: number; count: number }>();
    for (const r of rows) {
      const key = r.film_id ?? "__general__";
      const cur = agg.get(key) ?? { id: r.film_id, usd: 0, toman: 0, count: 0 };
      if (r.currency === "usd") cur.usd += r.amount;
      else if (r.currency === "toman") cur.toman += r.amount;
      cur.count += 1;
      agg.set(key, cur);
    }
    return [...agg.values()].sort((a, b) => (b.usd + b.toman / 100) - (a.usd + a.toman / 100));
  }, [rows]);

  const recent = rows.slice(0, 8);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Support"
        subtitle="Donor impact view — contributions from viewers supporting filmmakers. Full transaction ledger lives in Tickets & Sales."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <StatCard label="Support · USD" value={`$${(stats.usd / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <StatCard label="حمایت · تومان" value={stats.toman.toLocaleString()} rtl />
        <StatCard label="Contributions" value={stats.count.toString()} />
        <StatCard label="Supporters" value={stats.supporters.toString()} />
        <StatCard label="Films supported" value={stats.films.toString()} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading impact…</p>}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <HeartHandshake className="mx-auto h-8 w-8 mb-2 opacity-50" />
          No contributions yet. When viewers support a film, you'll see who, how much, and which films they're rallying behind.
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top supporters */}
          <section className="rounded-lg border border-border bg-card/40 overflow-hidden">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-medium">Top supporters</h2>
            </header>
            <ol className="divide-y divide-border">
              {topSupporters.map((s, i) => (
                <li key={s.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{s.label}</div>
                    {s.sublabel && <div className="truncate text-xs text-muted-foreground">{s.sublabel}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm tabular-nums">
                      {s.usd > 0 && <span>${(s.usd / 100).toFixed(0)}</span>}
                      {s.usd > 0 && s.toman > 0 && <span className="text-muted-foreground"> · </span>}
                      {s.toman > 0 && <span dir="rtl">{s.toman.toLocaleString()}﷼</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.count} gift{s.count === 1 ? "" : "s"}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* By film */}
          <section className="rounded-lg border border-border bg-card/40 overflow-hidden">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <FilmIcon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Support by film</h2>
            </header>
            <ol className="divide-y divide-border">
              {byFilm.map((f) => {
                const film = f.id ? films?.get(f.id) : null;
                return (
                  <li key={f.id ?? "general"} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      {film ? (
                        <Link to="/films/$slug" params={{ slug: film.slug }} className="truncate text-sm hover:underline block">
                          {film.title_en}
                        </Link>
                      ) : (
                        <span className="truncate text-sm text-muted-foreground">General fund</span>
                      )}
                      <div className="text-xs text-muted-foreground">{f.count} contribution{f.count === 1 ? "" : "s"}</div>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      {f.usd > 0 && <div>${(f.usd / 100).toFixed(0)}</div>}
                      {f.toman > 0 && <div className="text-xs text-muted-foreground" dir="rtl">{f.toman.toLocaleString()}﷼</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Recent feed */}
          <section className="rounded-lg border border-border bg-card/40 overflow-hidden lg:col-span-2">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-medium">Recent contributions</h2>
            </header>
            <ul className="divide-y divide-border">
              {recent.map((r) => {
                const film = r.film_id ? films?.get(r.film_id) : null;
                const profile = r.user_id ? profiles?.get(r.user_id) : null;
                const name = profile?.full_name || profile?.email || r.supporter || "Anonymous";
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <HeartHandshake className="h-4 w-4 text-rose-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground"> gave </span>
                      <span className="tabular-nums">{fmt(r.amount, r.currency)}</span>
                      {film && (
                        <>
                          <span className="text-muted-foreground"> to </span>
                          <Link to="/films/$slug" params={{ slug: film.slug }} className="hover:underline">{film.title_en}</Link>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${rtl ? "text-right" : ""}`} dir={rtl ? "rtl" : "ltr"}>{value}</div>
    </div>
  );
}
