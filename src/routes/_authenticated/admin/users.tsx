import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Shield, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdminPage,
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  locale: string;
  signup_country: string | null;
  status: string;
  created_at: string;
  last_active_at: string | null;
};

type RoleRow = { user_id: string; role: string };

async function loadUsers() {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, locale, signup_country, status, created_at, last_active_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);
  return {
    profiles: (profilesRes.data ?? []) as Profile[],
    roles: (rolesRes.data ?? []) as RoleRow[],
  };
}

function UsersAdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: loadUsers,
  });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (data?.roles ?? []).forEach((r) => {
      if (!map.has(r.user_id)) map.set(r.user_id, new Set());
      map.get(r.user_id)!.add(r.role);
    });
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const profiles = data?.profiles ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((p) =>
      [p.email, p.full_name, p.signup_country, p.id]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [data, q]);

  const grantAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Admin role granted");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Admin role revoked");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage profiles and admin roles.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, country…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 w-24">Locale</th>
              <th className="px-4 py-3 w-32">Country</th>
              <th className="px-4 py-3 w-40">Joined</th>
              <th className="px-4 py-3 w-32">Roles</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                No users match.
              </td></tr>
            )}
            {filtered.map((p) => {
              const roles = rolesByUser.get(p.id) ?? new Set();
              const isAdmin = roles.has("admin");
              const pending = grantAdmin.isPending || revokeAdmin.isPending;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email ?? p.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{p.locale}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.signup_country ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Revoke admin from ${p.email ?? p.id}?`)) {
                            revokeAdmin.mutate(p.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Grant admin to ${p.email ?? p.id}?`)) {
                            grantAdmin.mutate(p.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-2.5 py-1.5 text-xs hover:bg-primary/20 disabled:opacity-50"
                      >
                        <Shield className="h-3.5 w-3.5" /> Make admin
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing up to 500 most recent profiles.
      </p>
    </div>
  );
}
