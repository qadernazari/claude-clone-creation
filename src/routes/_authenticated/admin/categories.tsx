import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string;
  name_en: string;
  name_fa: string | null;
  sort_order: number;
};

async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_en, name_fa, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: listCategories,
  });

  const [id, setId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        id: id.trim(),
        name_en: nameEn.trim(),
        name_fa: nameFa.trim() || null,
        sort_order: sortOrder,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Category added");
      setId(""); setNameEn(""); setNameFa(""); setSortOrder(0);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (catId: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", catId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Slugs used to group films (e.g. drama, documentary).</p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="rounded-lg border border-border bg-card/40 p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 mb-8"
      >
        <input
          required value={id} onChange={(e) => setId(e.target.value)}
          placeholder="slug (e.g. drama)"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          required value={nameEn} onChange={(e) => setNameEn(e.target.value)}
          placeholder="Name (EN)"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={nameFa} onChange={(e) => setNameFa(e.target.value)}
          placeholder="نام (FA)" dir="rtl"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
          placeholder="Sort"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit" disabled={create.isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Name (EN)</th>
              <th className="px-4 py-3">Name (FA)</th>
              <th className="px-4 py-3 w-20">Sort</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && categories.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No categories yet.</td></tr>
            )}
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.name_en}</td>
                <td className="px-4 py-3" dir="rtl">{c.name_fa ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{c.sort_order}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete "${c.id}"?`)) remove.mutate(c.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
