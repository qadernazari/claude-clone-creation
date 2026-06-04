import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsPage,
});

type DiscountType = "percent" | "amount";
type AppliesTo = "membership" | "ticket" | "all";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  currency: string | null;
  applies_to: AppliesTo;
  film_id: string | null;
  max_redemptions: number | null;
  redemptions_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

type FilmOption = { id: string; title_en: string };

async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, currency, applies_to, film_id, max_redemptions, redemptions_count, expires_at, active, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Coupon[];
}

async function listFilms(): Promise<FilmOption[]> {
  const { data, error } = await supabase
    .from("films")
    .select("id, title_en")
    .order("title_en");
  if (error) throw new Error(error.message);
  return (data ?? []) as FilmOption[];
}

function formatDiscount(c: Coupon): string {
  if (c.discount_type === "percent") return `${c.discount_value}%`;
  const cur = (c.currency ?? "usd").toUpperCase();
  if (cur === "USD") return `$${(c.discount_value / 100).toFixed(2)}`;
  if (cur === "TOMAN") return `${c.discount_value.toLocaleString()} T`;
  return `${c.discount_value} ${cur}`;
}

function formatExpires(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const past = d.getTime() < Date.now();
  return `${d.toLocaleDateString()}${past ? " (expired)" : ""}`;
}

function CouponsPage() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: listCoupons,
  });
  const { data: films = [] } = useQuery({
    queryKey: ["admin", "coupons", "films"],
    queryFn: listFilms,
    staleTime: 5 * 60_000,
  });

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [currency, setCurrency] = useState<"usd" | "toman">("usd");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("all");
  const [filmId, setFilmId] = useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function resetForm() {
    setCode("");
    setDescription("");
    setDiscountType("percent");
    setDiscountValue("");
    setCurrency("usd");
    setAppliesTo("all");
    setFilmId("");
    setMaxRedemptions("");
    setExpiresAt("");
  }

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) throw new Error("Code is required");
      const value = Number(discountValue);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Discount value must be > 0");
      if (discountType === "percent" && value > 100) throw new Error("Percent must be 1–100");

      const payload = {
        code: trimmed,
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Math.round(value),
        currency: discountType === "amount" ? currency : null,
        applies_to: appliesTo,
        film_id: appliesTo === "ticket" && filmId ? filmId : null,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true,
      };

      const { error } = await supabase.from("coupons").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Coupon created");
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons & promo codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue discount codes for memberships or individual film tickets. Codes are validated at checkout.
          </p>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="rounded-lg border border-border bg-card/40 p-5 mb-8 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <div className="md:col-span-2">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Code</label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LAUNCH25"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="md:col-span-4">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Internal description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Launch promo — Twitter announcement"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Type</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="percent">Percent</option>
            <option value="amount">Fixed amount</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Value {discountType === "percent" ? "(%)" : currency === "usd" ? "(cents)" : "(toman)"}
          </label>
          <input
            required
            type="number"
            min={1}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={discountType === "percent" ? "25" : "500"}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {discountType === "amount" && (
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "usd" | "toman")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="usd">USD</option>
              <option value="toman">Toman</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Applies to</label>
          <select
            value={appliesTo}
            onChange={(e) => {
              const v = e.target.value as AppliesTo;
              setAppliesTo(v);
              if (v !== "ticket") setFilmId("");
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All checkouts</option>
            <option value="membership">Membership only</option>
            <option value="ticket">Film tickets only</option>
          </select>
        </div>

        {appliesTo === "ticket" && (
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              Restrict to film (optional)
            </label>
            <select
              value={filmId}
              onChange={(e) => setFilmId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Any film</option>
              {films.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title_en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Max redemptions
          </label>
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Unlimited"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Expires</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-6 flex justify-end">
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {create.isPending ? "Creating…" : "Create coupon"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3 w-24">Active</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <Tag className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  No coupons yet. Create one above.
                </td>
              </tr>
            )}
            {coupons.map((c) => {
              const filmName =
                c.film_id && films.find((f) => f.id === c.film_id)?.title_en;
              return (
                <tr key={c.id} className={c.active ? "" : "opacity-60"}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.code}
                    {c.description && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground font-sans normal-case">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 capitalize">
                    {c.applies_to}
                    {filmName && (
                      <div className="text-[11px] text-muted-foreground">{filmName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.redemptions_count}
                    {c.max_redemptions != null && (
                      <span className="text-muted-foreground"> / {c.max_redemptions}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatExpires(c.expires_at)}
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.active}
                        onChange={(e) =>
                          toggleActive.mutate({ id: c.id, active: e.target.checked })
                        }
                        className="rounded border-border"
                      />
                      <span className="text-xs text-muted-foreground">
                        {c.active ? "On" : "Off"}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete coupon "${c.code}"?`)) remove.mutate(c.id);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Codes are stored locally. At checkout, a one-shot Stripe coupon is created and attached
        to the session, then logged in the redemption history.
      </p>
    </div>
  );
}
