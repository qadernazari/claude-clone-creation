import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, HeartHandshake, CheckCircle2, Clock, XCircle } from "lucide-react";
import { SectionTabs, COMMERCE_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/contributions")({
  component: ContributionsPage,
});

type Row = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  supporter: string | null;
  provider: string | null;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
  film_id: string | null;
  user_id: string | null;
};

type FilmMap = Map<string, { slug: string; title_en: string }>;
type ProfileMap = Map<string, { email: string | null; full_name: string | null }>;

const PAGE_SIZE = 50;

async function loadContribs(page: number, statusFilter: string | null) {
  let q = supabase
    .from("contributions")
    .select(
      "id, status, amount, currency, supporter, provider, provider_ref, paid_at, created_at, film_id, user_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (statusFilter) q = q.eq("status", statusFilter);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as Row[], total: count ?? 0 };
}

async function loadFilms(): Promise<FilmMap> {
  const { data, error } = await supabase.from("films").select("id, slug, title_en");
  if (error) throw new Error(error.message);
  const map: FilmMap = new Map();
  for (const f of data ?? []) map.set(f.id, { slug: f.slug, title_en: f.title_en });
  return map;
}

async function loadProfiles(): Promise<ProfileMap> {
  const { data, error } = await supabase.from("profiles").select("id, email, full_name");
  if (error) throw new Error(error.message);
  const map: ProfileMap = new Map();
  for (const p of data ?? []) map.set(p.id, { email: p.email, full_name: p.full_name });
  return map;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  if (status === "refunded" || status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <HeartHandshake className="h-3 w-3" /> {status}
    </span>
  );
}

function ContributionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data: contribData, isLoading } = useQuery({
    queryKey: ["admin", "contributions", page, statusFilter],
    queryFn: () => loadContribs(page, statusFilter),
  });
  const { data: films } = useQuery({
    queryKey: ["admin", "films-map"],
    queryFn: loadFilms,
    staleTime: 5 * 60_000,
  });
  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles-map"],
    queryFn: loadProfiles,
    staleTime: 5 * 60_000,
  });

  const rows = contribData?.rows ?? [];
  const total = contribData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const film = r.film_id ? films?.get(r.film_id) : null;
      const profile = r.user_id ? profiles?.get(r.user_id) : null;
      return (
        (film?.title_en ?? "").toLowerCase().includes(needle) ||
        (profile?.email ?? "").toLowerCase().includes(needle) ||
        (profile?.full_name ?? "").toLowerCase().includes(needle) ||
        (r.supporter ?? "").toLowerCase().includes(needle) ||
        (r.provider_ref ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, films, profiles]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return counts;
  }, [rows]);

  const paidTotal = useMemo(
    () =>
      filtered
        .filter((r) => r.status === "paid" && r.currency === "usd")
        .reduce((sum, r) => sum + r.amount, 0),
    [filtered]
  );

  function exportCsv() {
    const headers = [
      "ID", "Supporter", "Name", "Email", "Film", "Amount", "Currency",
      "Status", "Provider", "Provider Ref", "Created", "Paid",
    ];
    const lines = filtered.map((r) => {
      const film = r.film_id ? films?.get(r.film_id) : null;
      const profile = r.user_id ? profiles?.get(r.user_id) : null;
      return [
        r.id, r.supporter ?? "", profile?.full_name ?? "", profile?.email ?? "",
        film?.title_en ?? "", String(r.amount), r.currency, r.status,
        r.provider ?? "", r.provider_ref ?? "", r.created_at, r.paid_at ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contributions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <SectionTabs section="Commerce" tabs={COMMERCE_TABS} />
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contributions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString()} total · ${(paidTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid (USD, this page)
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search supporter, film, email, ref…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setStatusFilter(null); setPage(1); }}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              statusFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            All {total > 0 ? `(${total})` : ""}
          </button>
          {["paid", "pending", "refunded", "failed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {s} {statusCounts.get(s) ? `(${statusCounts.get(s)})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Supporter</th>
              <th className="px-4 py-3">Film</th>
              <th className="px-4 py-3 w-28">Amount</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-28">Provider</th>
              <th className="px-4 py-3 w-32">Created</th>
              <th className="px-4 py-3 w-32">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No contributions match your filters.</td></tr>
            )}
            {filtered.map((r) => {
              const film = r.film_id ? films?.get(r.film_id) : null;
              const profile = r.user_id ? profiles?.get(r.user_id) : null;
              const displayName = profile?.full_name || r.supporter || "Anonymous";
              return (
                <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-foreground">{displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.email || (r.user_id ? r.user_id.slice(0, 8) : "—")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {film ? (
                      <Link to="/films/$slug" params={{ slug: film.slug }} className="font-medium text-foreground hover:underline">
                        {film.title_en}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">General fund</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.currency === "usd"
                      ? `$${(r.amount / 100).toFixed(2)}`
                      : `${r.amount.toLocaleString()} ${r.currency.toUpperCase()}`}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{r.provider ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
