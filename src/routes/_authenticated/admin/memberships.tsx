import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, CreditCard, RefreshCw, CheckCircle, Clock, Ban, Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/memberships")({
  component: MembershipsPage,
});

type Subscription = {
  id: string;
  user_id: string;
  status: string;
  amount_toman: number | null;
  ir_gateway: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

type Profile = { id: string; email: string | null; full_name: string | null };
type Trial = { user_id: string; ends_at: string; status: string };

async function fetchAll() {
  const [subs, trials] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, user_id, status, amount_toman, ir_gateway, stripe_subscription_id, current_period_start, current_period_end, created_at",
      )
      .order("current_period_start", { ascending: false })
      .limit(500),
    supabase
      .from("trials")
      .select("user_id, ends_at, status")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString()),
  ]);

  const rows = (subs.data ?? []) as Subscription[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  let profiles: Profile[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    profiles = (data ?? []) as Profile[];
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  return {
    rows,
    profileMap,
    activeTrials: (trials.data ?? []) as Trial[],
  };
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(r: Subscription) {
  if (!r.current_period_end) return false;
  return new Date(r.current_period_end).getTime() < Date.now();
}

function statusOf(r: Subscription): { label: string; cls: string } {
  if (r.status === "canceled") return { label: "Cancelled", cls: "bg-muted text-muted-foreground" };
  if (isExpired(r)) return { label: "Expired", cls: "bg-red-500/15 text-red-500" };
  if (r.status === "active" || r.status === "trialing")
    return { label: "Active", cls: "bg-emerald-500/15 text-emerald-500" };
  if (r.status === "past_due") return { label: "Past due", cls: "bg-amber-500/15 text-amber-500" };
  return { label: r.status, cls: "bg-muted text-muted-foreground" };
}

function gatewayBadge(r: Subscription) {
  if (r.ir_gateway === "admin_grant")
    return { label: "Admin Grant", cls: "bg-amber-500/15 text-amber-500" };
  const zp = r.ir_gateway === "zarinpal";
  if (zp) return { label: "ZarinPal", cls: "bg-emerald-500/15 text-emerald-500" };
  if (r.stripe_subscription_id) return { label: "Stripe", cls: "bg-blue-500/15 text-blue-500" };
  return { label: "—", cls: "bg-muted text-muted-foreground" };
}

function MembershipsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "memberships"], queryFn: fetchAll });
  const [q, setQ] = useState("");
  const [armedId, setArmedId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ id: string; months: number } | null>(null);
  const [grantArmed, setGrantArmed] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantMonths, setGrantMonths] = useState(1);


  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          current_period_end: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membership revoked — user access ended immediately.");
      qc.invalidateQueries({ queryKey: ["admin", "memberships"] });
      qc.invalidateQueries({ queryKey: ["admin", "counts"] });
      setArmedId(null);
    },
    onError: (e) => toast.error(`Revoke failed: ${(e as Error).message}`),
  });

  const restore = useMutation({
    mutationFn: async ({ id, months }: { id: string; months: number }) => {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + months);
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: expiresAt.toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { months }) => {
      toast.success(`Membership restored for ${months} month${months > 1 ? "s" : ""}.`);
      qc.invalidateQueries({ queryKey: ["admin", "memberships"] });
      qc.invalidateQueries({ queryKey: ["admin", "counts"] });
      setPendingRestore(null);
    },
    onError: (e) => toast.error(`Restore failed: ${(e as Error).message}`),
  });

  const grantFree = useMutation({
    mutationFn: async ({ email, months }: { email: string; months: number }) => {
      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.trim().toLowerCase())
        .limit(1);
      if (profileErr) throw profileErr;
      if (!profiles || profiles.length === 0)
        throw new Error("User not found. Make sure they have signed up first.");

      const userId = profiles[0].id;
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        status: "active",
        ir_gateway: "admin_grant",
        amount_toman: 0,
        current_period_start: now.toISOString(),
        current_period_end: expiresAt.toISOString(),
        environment: "live",
      });
      if (error) throw error;
      return { email, months };
    },
    onSuccess: ({ email, months }) => {
      toast.success(`Free ${months}-month membership granted to ${email}`);
      qc.invalidateQueries({ queryKey: ["admin", "memberships"] });
      qc.invalidateQueries({ queryKey: ["admin", "counts"] });
      setGrantEmail("");
      setGrantMonths(1);
      setGrantArmed(false);

    },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const p = data?.profileMap.get(r.user_id);
      return (
        r.user_id.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        (p?.email ?? "").toLowerCase().includes(needle) ||
        (p?.full_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [data, q]);

  const summary = useMemo(() => {
    const rows = data?.rows ?? [];
    const active = rows.filter((r) => (r.status === "active" || r.status === "trialing") && !isExpired(r));
    const zp = active.filter((r) => r.ir_gateway === "zarinpal");
    const stripe = active.filter((r) => r.ir_gateway !== "zarinpal" && r.ir_gateway !== "admin_grant");
    const tomanTotal = rows
      .filter((r) => r.ir_gateway === "zarinpal")
      .reduce((s, r) => s + Number(r.amount_toman ?? 0), 0);
    return {
      active: active.length,
      zp: zp.length,
      stripe: stripe.length,
      tomanTotal,
      trials: data?.activeTrials.length ?? 0,
    };
  }, [data]);

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All subscriptions across Stripe and ZarinPal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin", "memberships"] })}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Active total" value={summary.active} icon={CheckCircle} />
        <Kpi label="ZarinPal active" value={summary.zp} icon={CreditCard} />
        <Kpi label="Stripe active" value={summary.stripe} icon={CreditCard} />
        <Kpi
          label="Toman revenue"
          value={summary.tomanTotal}
          sub={`${summary.tomanTotal.toLocaleString()} T`}
          icon={CreditCard}
        />
        <Kpi label="Active trials" value={summary.trials} icon={Clock} />
      </div>

      {/* Grant free membership */}
      <div className="mb-4 rounded-lg border border-border bg-card/40 p-4">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          Grant free membership
        </h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">User email</label>
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => { setGrantEmail(e.target.value); setGrantArmed(false); }}
              placeholder="user@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
            <select
              value={grantMonths}
              onChange={(e) => { setGrantMonths(parseInt(e.target.value)); setGrantArmed(false); }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
          <button
            type="button"
            disabled={!grantEmail.trim() || grantFree.isPending}
            onClick={() => {
              if (!grantArmed) {
                setGrantArmed(true);
                setTimeout(() => setGrantArmed((v) => v), 0);
                return;
              }
              grantFree.mutate({ email: grantEmail, months: grantMonths });
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
              grantArmed
                ? "bg-amber-500 text-black hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
            title={grantArmed ? "Click again to confirm" : "Grant access"}
          >
            {grantFree.isPending
              ? "Granting…"
              : grantArmed
              ? `Confirm grant ${grantMonths}mo → ${grantEmail.trim()}`
              : "Grant access"}
          </button>
          {grantArmed && !grantFree.isPending && (
            <button
              type="button"
              onClick={() => setGrantArmed(false)}
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          )}
        </div>
        {grantFree.isError && (
          <p className="mt-2 text-xs text-destructive">{(grantFree.error as Error).message}</p>
        )}
      </div>


      <div className="mb-3 relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email, name, user id…"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">User</th>
                <th className="text-left px-3 py-2 font-medium">Gateway</th>
                <th className="text-left px-3 py-2 font-medium">Amount</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Start</th>
                <th className="text-left px-3 py-2 font-medium">Expiry</th>
                <th className="text-left px-3 py-2 font-medium">Days left</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No memberships found.</td></tr>
              )}
              {filtered.map((r) => {
                const profile = data?.profileMap.get(r.user_id);
                const s = statusOf(r);
                const g = gatewayBadge(r);
                const days = daysUntil(r.current_period_end);
                const expired = isExpired(r);
                const isActive = (r.status === "active" || r.status === "trialing" || r.status === "past_due") && !expired;
                const isCancelledOrExpired = r.status === "canceled" || expired;
                const armed = armedId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <div className="text-foreground text-xs truncate max-w-[220px]">
                        {profile?.email ?? profile?.full_name ?? "—"}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.user_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${g.cls}`}>
                        {g.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {r.ir_gateway === "admin_grant"
                        ? "Free"
                        : r.ir_gateway === "zarinpal" && r.amount_toman
                        ? `${Number(r.amount_toman).toLocaleString()} T`
                        : r.stripe_subscription_id
                        ? "USD"
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmt(r.current_period_start)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmt(r.current_period_end)}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">
                      {days === null ? "—" : days < 0 ? <span className="text-red-500">expired</span> : `${days}d`}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isActive && (
                        <button
                          type="button"
                          disabled={revoke.isPending}
                          onClick={() => {
                            if (armed) {
                              revoke.mutate(r.id);
                            } else {
                              setArmedId(r.id);
                              setTimeout(() => {
                                setArmedId((cur) => (cur === r.id ? null : cur));
                              }, 4000);
                            }
                          }}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                            armed
                              ? "bg-destructive text-destructive-foreground"
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          }`}
                          title={armed ? "Confirm revoke" : "Revoke membership"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {armed ? "Confirm end access" : "Revoke"}
                        </button>
                      )}
                      {isCancelledOrExpired && (
                        <div className="flex items-center gap-1 justify-end">
                          {pendingRestore?.id === r.id ? (
                            <>
                              <button
                                type="button"
                                disabled={restore.isPending}
                                onClick={() => restore.mutate(pendingRestore)}
                                className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-black hover:opacity-90 disabled:opacity-50"
                              >
                                {restore.isPending
                                  ? "Restoring…"
                                  : `Confirm restore ${pendingRestore.months}mo`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingRestore(null)}
                                className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <select
                              className="rounded border border-border bg-background px-1.5 py-1 text-xs"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setPendingRestore({ id: r.id, months: parseInt(e.target.value) });
                                  e.target.value = "";
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>Restore…</option>
                              <option value="1">1 month</option>
                              <option value="3">3 months</option>
                              <option value="6">6 months</option>
                              <option value="12">12 months</option>
                            </select>
                          )}
                        </div>
                      )}

                      {!isActive && !isCancelledOrExpired && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
