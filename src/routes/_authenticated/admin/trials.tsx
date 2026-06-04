import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Users, Clock, CheckCircle2, XCircle, Globe2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/trials")({
  component: TrialAnalyticsPage,
});

type TrialRow = {
  id: string;
  user_id: string;
  email: string;
  country: string | null;
  started_at: string;
  ends_at: string;
  status: string; // active | expired | converted
  converted_at: string | null;
};

type SubRow = { user_id: string; price_id: string; status: string };

const MEMBERSHIP_PRICE_USD = 9.99; // display approximation for revenue estimate

async function loadAll() {
  const { data, error } = await supabase
    .from("trials")
    .select("id, user_id, email, country, started_at, ends_at, status, converted_at")
    .order("started_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as TrialRow[];
}

async function loadConvertedSubs(userIds: string[]) {
  if (userIds.length === 0) return [] as SubRow[];
  const { data, error } = await supabase
    .from("subscriptions")
    .select("user_id, price_id, status")
    .in("user_id", userIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as SubRow[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function trialStatus(t: TrialRow): "active" | "expired" | "converted" {
  if (t.status === "converted") return "converted";
  if (t.status === "active" && new Date(t.ends_at) > new Date()) return "active";
  return "expired";
}

type Filter = "all" | "active" | "expired" | "converted";

function TrialAnalyticsPage() {
  const { data: trials = [], isLoading } = useQuery({ queryKey: ["admin-trials"], queryFn: loadAll });
  const userIds = useMemo(() => trials.map((t) => t.user_id), [trials]);
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-trial-subs", userIds.length],
    enabled: userIds.length > 0,
    queryFn: () => loadConvertedSubs(userIds),
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Mark conversions = trial user_ids that have an active/past subscription
  const convertedUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      if (["active", "trialing", "past_due", "canceled"].includes(s.status)) set.add(s.user_id);
    }
    return set;
  }, [subs]);

  const enriched = useMemo(
    () =>
      trials.map((t) => {
        const derived = convertedUserIds.has(t.user_id) ? "converted" : trialStatus(t);
        return { ...t, derived };
      }),
    [trials, convertedUserIds],
  );

  const totals = useMemo(() => {
    const active = enriched.filter((t) => t.derived === "active").length;
    const expired = enriched.filter((t) => t.derived === "expired").length;
    const converted = enriched.filter((t) => t.derived === "converted").length;
    const total = enriched.length;
    const completed = total - active;
    const conversionRate = completed > 0 ? (converted / completed) * 100 : 0;
    const revenueEstimate = converted * MEMBERSHIP_PRICE_USD;
    const countries: Record<string, number> = {};
    for (const t of enriched) {
      const c = t.country ?? "Unknown";
      countries[c] = (countries[c] ?? 0) + 1;
    }
    const topCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { total, active, expired, converted, conversionRate, revenueEstimate, topCountries };
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((t) => {
      if (filter !== "all" && t.derived !== filter) return false;
      if (q && !t.email.toLowerCase().includes(q) && !(t.country ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Trial Analytics</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Total trials" value={totals.total.toString()} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Active" value={totals.active.toString()} />
        <KpiCard icon={<XCircle className="h-4 w-4" />} label="Expired" value={totals.expired.toString()} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Converted" value={totals.converted.toString()} />
        <KpiCard label="Conv. rate" value={`${totals.conversionRate.toFixed(1)}%`} />
        <KpiCard label="Est. revenue" value={`$${totals.revenueEstimate.toFixed(0)}`} />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Globe2 className="h-4 w-4" /> Top countries
        </h2>
        {totals.topCountries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trial activity yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            {totals.topCountries.map(([country, count]) => (
              <li key={country} className="flex items-center justify-between rounded border bg-background px-3 py-2">
                <span>{country}</span>
                <span className="text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex gap-1 rounded-md border bg-background p-1 text-xs">
            {(["all", "active", "expired", "converted"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1.5 capitalize transition-colors ${
                  filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or country…"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm md:w-72"
          />
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No trials match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Country</th>
                  <th className="px-4 py-2.5">Started</th>
                  <th className="px-4 py-2.5">Ends</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{t.email}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.country ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(t.started_at)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(t.ends_at)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={t.derived as "active" | "expired" | "converted"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "expired" | "converted" }) {
  const cls =
    status === "active"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : status === "converted"
        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
