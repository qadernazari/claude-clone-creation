import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contact-submissions")({
  component: ContactSubmissionsPage,
});

type Row = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

async function loadSubmissions(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("id, name, email, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function ContactSubmissionsPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "contact_submissions"],
    queryFn: loadSubmissions,
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(n) ||
        r.email.toLowerCase().includes(n) ||
        r.message.toLowerCase().includes(n)
    );
  }, [rows, q]);

  function exportCsv() {
    const headers = ["Name", "Email", "Message", "Received"];
    const lines = filtered.map((r) =>
      [r.name, r.email, r.message, r.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contact Submissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length.toLocaleString()} messages received.
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

      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, message…"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3 w-32">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  <MessageSquare className="mx-auto mb-2 h-5 w-5 opacity-50" />
                  No messages yet.
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer transition-colors ${
                    selected?.id === r.id ? "bg-accent/40" : "hover:bg-accent/20"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {r.message.slice(0, 80)}{r.message.length > 80 ? "…" : ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="rounded-lg border border-border p-5 h-fit sticky top-6">
          {selected ? (
            <div>
              <div className="mb-3 pb-3 border-b border-border">
                <div className="text-sm font-medium text-foreground">{selected.name}</div>
                <a href={`mailto:${selected.email}`} className="text-xs text-muted-foreground hover:underline">
                  {selected.email}
                </a>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {selected.message}
              </p>
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: your message")}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Reply by email
              </a>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Select a message to read it here.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
