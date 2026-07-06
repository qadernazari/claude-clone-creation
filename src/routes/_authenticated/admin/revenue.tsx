import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { TrendingUp, CreditCard, DollarSign, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  component: RevenuePage,
});

type Payment = {
  id: string;
  authority: string;
  user_id: string | null;
  kind: string;
  item_id: string | null;
  amount_toman: number | null;
  ref_id: string | null;
  status: string;
  created_at: string;
};

type Profile = { id: string; email: string | null };

function formatToman(amount: number): string {
  return amount.toLocaleString("fa-IR") + " ت";
}

async function fetchRevenue() {
  const [pr, allPaidRes, activeSubsRes] = await Promise.all([
    supabase
      .from("ir_payment_requests")
      .select("id, authority, user_id, kind, item_id, amount_toman, ref_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("ir_payment_requests")
      .select("amount_toman, created_at, status")
      .eq("status", "paid"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("ir_gateway", "zarinpal"),
  ]);

  if (pr.error) throw new Error(pr.error.message);

  const payments = (pr.data ?? []) as Payment[];
  const userIds = Array.from(new Set(payments.map((p) => p.user_id).filter(Boolean))) as string[];

  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, email").in("id", userIds);
    profiles = (data ?? []) as Profile[];
  }
  const emailById = new Map(profiles.map((p) => [p.id, p.email]));

  const allPaid = (allPaidRes.data ?? []) as { amount_toman: number | null; created_at: string; status: string }[];
  const totalToman = allPaid.reduce((s, p) => s + (p.amount_toman ?? 0), 0);
  const paidCount = allPaid.length;
  const avg = paidCount > 0 ? Math.round(totalToman / paidCount) : 0;

  return {
    payments: payments.slice(0, 50).map((p) => ({ ...p, email: emailById.get(p.user_id ?? "") ?? null })),
    totalToman,
    paidCount,
    avg,
    activeZarinpalSubs: activeSubsRes.count ?? 0,
    allPaid,
  };
}

function RevenuePage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "revenue"], queryFn: fetchRevenue });

  const monthly = useMemo(() => {
    if (!data) return [] as { month: string; amount: number }[];
    const map = new Map<string, number>();
    for (const p of data.allPaid) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + (p.amount_toman ?? 0));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, amount]) => {
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        return { month: label, amount };
      });
  }, [data]);

  const maxRevenue = Math.max(...monthly.map((m) => m.amount), 1);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Revenue" subtitle="ZarinPal payments, subscriptions and revenue trends." />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="Total Toman revenue" value={data ? formatToman(data.totalToman) : "—"} icon={<TrendingUp className="h-4 w-4 text-amber-400" />} />
        <Kpi label="ZarinPal payments" value={data ? data.paidCount.toString() : "—"} icon={<CreditCard className="h-4 w-4" />} />
        <Kpi label="Average payment" value={data ? formatToman(data.avg) : "—"} icon={<DollarSign className="h-4 w-4" />} />
        <Kpi label="Active ZarinPal subs" value={data ? data.activeZarinpalSubs.toString() : "—"} icon={<Users className="h-4 w-4 text-emerald-400" />} />
        <Kpi label="Stripe revenue" value="Pending" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} muted />
      </div>

      <div className="rounded-lg border border-border bg-card/40 p-6 mb-6">
        <div className="text-sm font-medium mb-4">Monthly revenue (Toman)</div>
        {monthly.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No paid payments yet.</div>
        ) : (
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {monthly.map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1 min-w-[56px]">
                <span className="text-[10px] text-muted-foreground tabular-nums">{formatToman(m.amount)}</span>
                <div
                  className="w-12 bg-amber-500 rounded-t"
                  style={{ height: `${Math.max(4, (m.amount / maxRevenue) * 140)}px` }}
                />
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/60 text-sm font-medium">
          Recent ZarinPal payments
        </div>
        <table className="w-full text-sm">
          <thead className="bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-28">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 w-32">Kind</th>
              <th className="px-4 py-3 w-36">Amount</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-32">Ref ID</th>
              <th className="px-4 py-3 w-40">Authority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && (data?.payments?.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No payments yet.</td></tr>
            )}
            {data?.payments.map((p) => (
              <tr key={p.id} className="hover:bg-accent/30">
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs">{p.email ?? p.user_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3">
                  <KindBadge kind={p.kind} />
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">{formatToman(p.amount_toman ?? 0)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{p.ref_id ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground truncate">
                  {p.authority ? p.authority.slice(0, 20) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, muted }: { label: string; value: string; icon?: React.ReactNode; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}>{value}</div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    membership: "bg-emerald-500/15 text-emerald-400",
    ticket: "bg-sky-500/15 text-sky-400",
    contribution: "bg-violet-500/15 text-violet-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[kind] ?? "bg-muted text-muted-foreground"}`}>
      {kind}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    failed: "bg-rose-500/15 text-rose-400",
    canceled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
