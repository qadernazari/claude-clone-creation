import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, Ticket, TicketCheck, TicketX, Clock } from "lucide-react";
import { SectionTabs, COMMERCE_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: TicketsPage,
});

type TicketRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  film_id: string;
  user_id: string;
};

type FilmMap = Map<string, { slug: string; title_en: string; title_fa: string | null }>;
type ProfileMap = Map<string, { email: string | null; full_name: string | null }>;

const PAGE_SIZE = 50;

async function loadTickets(page: number, statusFilter: string | null) {
  let q = supabase
    .from("tickets")
    .select("id, status, amount, currency, paid_at, expires_at, created_at, film_id, user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (statusFilter) {
    q = q.eq("status", statusFilter);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as TicketRow[], total: count ?? 0 };
}

async function loadFilms(): Promise<FilmMap> {
  const { data, error } = await supabase
    .from("films")
    .select("id, slug, title_en, title_fa");
  if (error) throw new Error(error.message);
  const map = new Map<string, { slug: string; title_en: string; title_fa: string | null }>();
  for (const f of data ?? []) {
    map.set(f.id, { slug: f.slug, title_en: f.title_en, title_fa: f.title_fa });
  }
  return map;
}

async function loadProfiles(): Promise<ProfileMap> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name");
  if (error) throw new Error(error.message);
  const map = new Map<string, { email: string | null; full_name: string | null }>();
  for (const p of data ?? []) {
    map.set(p.id, { email: p.email, full_name: p.full_name });
  }
  return map;
}

function TicketsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data: ticketData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["admin", "tickets", page, statusFilter],
    queryFn: () => loadTickets(page, statusFilter),
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

  const rows = ticketData?.rows ?? [];
  const total = ticketData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((t) => {
      const film = films?.get(t.film_id);
      const profile = profiles?.get(t.user_id);
      const filmTitle = film?.title_en ?? "";
      const email = profile?.email ?? "";
      const name = profile?.full_name ?? "";
      return (
        filmTitle.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle) ||
        name.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, films, profiles]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of rows) {
      counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  function exportCsv() {
    const headers = ["ID", "Film", "User", "Email", "Amount", "Currency", "Status", "Created", "Paid", "Expires"];
    const lines = filtered.map((t) => {
      const film = films?.get(t.film_id);
      const profile = profiles?.get(t.user_id);
      return [
        t.id,
        film?.title_en ?? "",
        profile?.full_name ?? "",
        profile?.email ?? "",
        String(t.amount),
        t.currency,
        t.status,
        t.created_at,
        t.paid_at ?? "",
        t.expires_at ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function StatusBadge({ status }: { status: string }) {
    if (status === "paid")
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
          <TicketCheck className="h-3 w-3" /> Paid
        </span>
      );
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    if (status === "refunded")
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
          <TicketX className="h-3 w-3" /> Refunded
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Ticket className="h-3 w-3" /> {status}
      </span>
    );
  }

  const paidStats = useMemo(() => {
    const paid = rows.filter((t) => t.status === "paid");
    const usd = paid.filter((t) => t.currency === "usd").reduce((s, t) => s + t.amount, 0);
    const toman = paid.filter((t) => t.currency === "toman").reduce((s, t) => s + t.amount, 0);
    return { count: paid.length, usd, toman };
  }, [rows]);

  return (
    <>
      <SectionTabs section="Commerce" tabs={COMMERCE_TABS} />
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets & Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every ticket purchase across the platform · {total.toLocaleString()} total.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <div className="text-xs text-muted-foreground">Ticket revenue (USD)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">${(paidStats.usd / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <div className="text-xs text-muted-foreground">درآمد بلیت (تومان)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-right" dir="rtl">{paidStats.toman.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <div className="text-xs text-muted-foreground">Paid tickets</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{paidStats.count.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <div className="text-xs text-muted-foreground">All time</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{total.toLocaleString()}</div>
        </div>
      </div>


      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search film, user, or email…"
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
          {["paid", "pending", "refunded"].map((s) => (
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

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Film</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 w-28">Amount</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-32">Created</th>
              <th className="px-4 py-3 w-32">Paid</th>
              <th className="px-4 py-3 w-32">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ticketsLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!ticketsLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No tickets match your filters.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const film = films?.get(t.film_id);
              const profile = profiles?.get(t.user_id);
              return (
                <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    {film ? (
                      <Link
                        to="/films/$slug"
                        params={{ slug: film.slug }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {film.title_en}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">{profile?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email || t.user_id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {t.currency === "usd"
                      ? `$${(t.amount / 100).toFixed(2)}`
                      : `${t.amount.toLocaleString()} ${t.currency.toUpperCase()}`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {t.paid_at ? new Date(t.paid_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
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
