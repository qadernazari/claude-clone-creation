import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Shield, ShieldOff, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: MembersPage,
});

type Profile = {
  id: string; email: string | null; full_name: string | null; locale: string;
  signup_ip: string | null; last_ip: string | null;
  signup_country: string | null; signup_city: string | null;
  status: string; created_at: string; last_active_at: string | null;
};

async function loadMembers() {
  const [pr, rr] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, locale, signup_ip, last_ip, signup_country, signup_city, status, created_at, last_active_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pr.error) throw new Error(pr.error.message);
  return { profiles: (pr.data ?? []) as Profile[], roles: rr.data ?? [] };
}

// Tiny country-code emoji helper for ISO country names — best-effort, falls back to plain text.
const COUNTRY_FLAGS: Record<string, string> = {
  iran: "🇮🇷", "united states": "🇺🇸", canada: "🇨🇦", germany: "🇩🇪", france: "🇫🇷",
  "united kingdom": "🇬🇧", netherlands: "🇳🇱", sweden: "🇸🇪", australia: "🇦🇺",
  turkey: "🇹🇷", "united arab emirates": "🇦🇪", spain: "🇪🇸", italy: "🇮🇹",
};
function flagFor(country: string | null): string {
  if (!country) return "";
  return COUNTRY_FLAGS[country.toLowerCase()] ?? "🌐";
}

function MembersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "members"], queryFn: loadMembers });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (data?.roles ?? []).forEach((r) => {
      if (!map.has(r.user_id)) map.set(r.user_id, new Set());
      map.get(r.user_id)!.add(r.role);
    });
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const list = data?.profiles ?? [];
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter((p) => [p.email, p.full_name, p.signup_country, p.signup_city, p.signup_ip, p.last_ip].some((v) => (v ?? "").toLowerCase().includes(n)));
  }, [data, q]);

  const stats = useMemo(() => {
    const list = data?.profiles ?? [];
    const countries = new Map<string, number>();
    for (const p of list) {
      if (!p.signup_country) continue;
      countries.set(p.signup_country, (countries.get(p.signup_country) ?? 0) + 1);
    }
    const top = [...countries.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total: list.length, countries: countries.size, top };
  }, [data]);

  const grantAdmin = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Admin granted"); qc.invalidateQueries({ queryKey: ["admin", "members"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const revokeAdmin = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Admin revoked"); qc.invalidateQueries({ queryKey: ["admin", "members"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Members"
        subtitle="Registered accounts, with where they signed up from and recent activity."
        right={
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, country, IP…" className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm" />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total members" value={stats.total.toString()} />
        <StatCard label="Countries" value={stats.countries.toString()} />
        <StatCard label="Top country" value={stats.top ? `${flagFor(stats.top[0])} ${stats.top[0]} · ${stats.top[1]}` : "—"} />
      </div>

      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{(error as Error).message}</div>}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3 w-48">Location</th>
              <th className="px-4 py-3 w-40">IP address</th>
              <th className="px-4 py-3 w-32">Registered</th>
              <th className="px-4 py-3 w-32">Last active</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No members yet.</td></tr>}
            {filtered.map((p) => {
              const roles = rolesByUser.get(p.id) ?? new Set();
              const isAdmin = roles.has("admin");
              return (
                <tr key={p.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email ?? p.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.signup_country ? (
                      <>
                        <div>{flagFor(p.signup_country)} {p.signup_country}</div>
                        {p.signup_city && <div className="text-xs text-muted-foreground">{p.signup_city}</div>}
                      </>
                    ) : <span className="text-muted-foreground inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> —</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.last_ip ?? p.signup_ip ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.last_active_at ? new Date(p.last_active_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      <button type="button" onClick={() => revokeAdmin.mutate(p.id)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke
                      </button>
                    ) : (
                      <button type="button" onClick={() => grantAdmin.mutate(p.id)} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-2.5 py-1.5 text-xs hover:bg-primary/20">
                        <Shield className="h-3.5 w-3.5" /> Make admin
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Location is detected from each member's IP at sign-up. Country is reliable; city is approximate, and members using a VPN will show the VPN's location.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
