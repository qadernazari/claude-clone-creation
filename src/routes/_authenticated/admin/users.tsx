import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Search, Users as UsersIcon, Crown, Clock } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  locale: string | null;
  signup_country: string | null;
  signup_city: string | null;
  last_active_at: string | null;
  created_at: string;
  status: string | null;
};

type Sub = {
  user_id: string;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  ir_gateway: string | null;
};

type MergedUser = Profile & {
  memberStatus: "member" | "trial" | "free";
  gateway: string | null;
  expiresAt: string | null;
};

async function fetchUsers(): Promise<MergedUser[]> {
  const [pr, sr] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, locale, signup_country, signup_city, last_active_at, created_at, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("user_id, status, current_period_end, trial_end, ir_gateway")
      .in("status", ["active", "trialing"]),
  ]);
  if (pr.error) throw new Error(pr.error.message);
  const profiles = (pr.data ?? []) as Profile[];
  const subs = (sr.data ?? []) as Sub[];
  const now = new Date();
  return profiles.map((p) => {
    const userSubs = subs.filter((s) => s.user_id === p.id);
    const activeSub = userSubs.find(
      (s) => s.status === "active" && s.current_period_end && new Date(s.current_period_end) > now,
    );
    const trialSub = userSubs.find((s) => s.trial_end && new Date(s.trial_end) > now);
    return {
      ...p,
      memberStatus: activeSub ? "member" : trialSub ? "trial" : "free",
      gateway: activeSub?.ir_gateway ?? null,
      expiresAt: activeSub?.current_period_end ?? null,
    };
  });
}

function relative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function avatarColor(id: string): string {
  const colors = [
    "bg-rose-500/20 text-rose-400",
    "bg-amber-500/20 text-amber-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-sky-500/20 text-sky-400",
    "bg-violet-500/20 text-violet-400",
    "bg-pink-500/20 text-pink-400",
    "bg-teal-500/20 text-teal-400",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

const PAGE_SIZE = 25;

function UsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "users-list"], queryFn: fetchUsers });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter((u) =>
      [u.email, u.full_name].some((v) => (v ?? "").toLowerCase().includes(n)),
    );
  }, [data, q]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
    return {
      total: list.length,
      members: list.filter((u) => u.memberStatus === "member").length,
      trials: list.filter((u) => u.memberStatus === "trial").length,
      recent: list.filter((u) => new Date(u.created_at).getTime() > sevenDaysAgo).length,
    };
  }, [data]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Users"
        subtitle="All registered accounts on ir.show."
        right={
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search email or name…"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total users" value={stats.total.toString()} icon={<UsersIcon className="h-4 w-4" />} />
        <StatCard label="Active members" value={stats.members.toString()} icon={<Crown className="h-4 w-4 text-emerald-400" />} />
        <StatCard label="Trial users" value={stats.trials.toString()} icon={<Clock className="h-4 w-4 text-amber-400" />} />
        <StatCard label="New (7d)" value={stats.recent.toString()} icon={<UsersIcon className="h-4 w-4 text-sky-400" />} />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3 w-28">Locale</th>
              <th className="px-4 py-3 w-32">Country</th>
              <th className="px-4 py-3 w-28">Status</th>
              <th className="px-4 py-3 w-32">Joined</th>
              <th className="px-4 py-3 w-32">Last active</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && pageRows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>
            )}
            {pageRows.map((u) => {
              const initial = (u.email ?? u.id).charAt(0).toUpperCase();
              return (
                <tr key={u.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ${avatarColor(u.id)}`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.email ?? u.id.slice(0, 8)}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.full_name ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.locale === "fa" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-400 px-2 py-0.5">ایران 🇮🇷</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-400 px-2 py-0.5">Global 🌍</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.signup_country ?? "—"}
                    {u.signup_city && <div className="text-[10px]">{u.signup_city}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {u.memberStatus === "member" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-xs">Member</span>
                    )}
                    {u.memberStatus === "trial" && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-xs">Trial</span>
                    )}
                    {u.memberStatus === "free" && (
                      <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{relative(u.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{relative(u.last_active_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/admin/memberships"
                      search={{ user: u.email ?? "" } as never}
                      className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Page {pageSafe + 1} of {pageCount} · {filtered.length} users
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pageSafe === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-accent"
          >Previous</button>
          <button
            type="button"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-accent"
          >Next</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
