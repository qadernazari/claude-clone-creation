import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/notify-list")({
  component: NotifyListPage,
});

type Row = {
  id: string;
  email_lower: string;
  locale: string | null;
  created_at: string;
};

async function loadNotifyList(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("notify_list")
    .select("id, email_lower, locale, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function NotifyListPage() {
  const [q, setQ] = useState("");
  const [localeFilter, setLocaleFilter] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "notify_list"],
    queryFn: loadNotifyList,
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (localeFilter && r.locale !== localeFilter) return false;
      if (q.trim() && !r.email_lower.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, q, localeFilter]);

  const enCount = rows.filter((r) => r.locale === "en").length;
  const faCount = rows.filter((r) => r.locale === "fa").length;

  function exportCsv() {
    const headers = ["Email", "Locale", "Subscribed"];
    const lines = filtered.map((r) =>
      [r.email_lower, r.locale ?? "", r.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notify-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notify List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length.toLocaleString()} subscribers · {enCount} EN · {faCount} FA
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
            placeholder="Search email…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLocaleFilter(null)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              localeFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setLocaleFilter("en")}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              localeFilter === "en"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            EN ({enCount})
          </button>
          <button
            type="button"
            onClick={() => setLocaleFilter("fa")}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              localeFilter === "fa"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            FA ({faCount})
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 w-24">Locale</th>
              <th className="px-4 py-3 w-40">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                <Mail className="mx-auto mb-2 h-5 w-5 opacity-50" />
                No subscribers match your filters.
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.email_lower}</td>
                <td className="px-4 py-3 uppercase text-xs text-muted-foreground">{r.locale ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
