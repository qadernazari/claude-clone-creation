import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, HeartHandshake, CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";
import { capitalize } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: SupportPage,
});

type Row = {
  id: string; status: string; amount: number; currency: string;
  supporter: string | null; provider: string | null; provider_ref: string | null;
  paid_at: string | null; created_at: string; film_id: string | null; user_id: string | null;
};
type FilmMap = Map<string, { slug: string; title_en: string }>;
type ProfileMap = Map<string, { email: string | null; full_name: string | null }>;

async function loadAll() {
  const [c, f, p] = await Promise.all([
    supabase.from("contributions").select("id, status, amount, currency, supporter, provider, provider_ref, paid_at, created_at, film_id, user_id").order("created_at", { ascending: false }).limit(1000),
    supabase.from("films").select("id, slug, title_en"),
    supabase.from("profiles").select("id, email, full_name"),
  ]);
  if (c.error) throw new Error(c.error.message);
  const films: FilmMap = new Map((f.data ?? []).map((x) => [x.id, { slug: x.slug, title_en: x.title_en }]));
  const profiles: ProfileMap = new Map((p.data ?? []).map((x) => [x.id, { email: x.email, full_name: x.full_name }]));
  return { rows: (c.data ?? []) as Row[], films, profiles };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Paid</span>;
  if (status === "pending") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400"><Clock className="h-3 w-3" /> Pending</span>;
  if (status === "refunded" || status === "failed") return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400"><XCircle className="h-3 w-3" /> {capitalize(status)}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"><HeartHandshake className="h-3 w-3" /> {capitalize(status)}</span>;
}

function SupportPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "support-all"], queryFn: loadAll });
  const [q, setQ] = useState("");
  const rows = data?.rows ?? [];
  const films = data?.films;
  const profiles = data?.profiles;

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      const film = r.film_id ? films?.get(r.film_id) : null;
      const profile = r.user_id ? profiles?.get(r.user_id) : null;
      return (
        (film?.title_en ?? "").toLowerCase().includes(n) ||
        (profile?.email ?? "").toLowerCase().includes(n) ||
        (profile?.full_name ?? "").toLowerCase().includes(n) ||
        (r.supporter ?? "").toLowerCase().includes(n)
      );
    });
  }, [rows, q, films, profiles]);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid");
    const usd = paid.filter((r) => r.currency === "usd").reduce((s, r) => s + r.amount, 0);
    const toman = paid.filter((r) => r.currency === "toman").reduce((s, r) => s + r.amount, 0);
    const films = new Set(paid.map((r) => r.film_id).filter(Boolean));
    return { usd, toman, count: paid.length, films: films.size };
  }, [rows]);

  function exportCsv() {
    const headers = ["Supporter", "Film", "Amount", "Currency", "Method", "Status", "Date"];
    const lines = filtered.map((r) => {
      const film = r.film_id ? films?.get(r.film_id) : null;
      const profile = r.user_id ? profiles?.get(r.user_id) : null;
      return [
        profile?.full_name || profile?.email || r.supporter || "Anonymous",
        film?.title_en ?? "General",
        String(r.amount), r.currency, r.provider ?? "", r.status, r.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Support"
        subtitle="Contributions from viewers supporting filmmakers — no ticket required."
        right={
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-40">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Support · USD" value={`$${(stats.usd / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <StatCard label="حمایت · تومان" value={stats.toman.toLocaleString()} rtl />
        <StatCard label="Total contributions" value={stats.count.toString()} />
        <StatCard label="Films supported" value={stats.films.toString()} />
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supporter, film, email…" className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Supporter</th>
              <th className="px-4 py-3">Film</th>
              <th className="px-4 py-3 w-28">Amount</th>
              <th className="px-4 py-3 w-28">Method</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-32">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No contributions yet.</td></tr>}
            {filtered.map((r) => {
              const film = r.film_id ? films?.get(r.film_id) : null;
              const profile = r.user_id ? profiles?.get(r.user_id) : null;
              return (
                <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>{profile?.full_name || r.supporter || "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {film ? <Link to="/films/$slug" params={{ slug: film.slug }} className="hover:underline">{film.title_en}</Link> : <span className="text-muted-foreground">General fund</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.currency === "usd" ? `$${(r.amount / 100).toFixed(2)}` : `${r.amount.toLocaleString()} ${r.currency.toUpperCase()}`}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{r.provider ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
