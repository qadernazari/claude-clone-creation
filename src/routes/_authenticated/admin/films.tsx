import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Eye, EyeOff, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/films")({
  component: FilmsAdminPage,
});

type Film = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  price_cents: number;
  price_toman: number;
  visibility: string;
  sort_order: number;
  cover_url: string | null;
  video_url: string | null;
  preview_url: string | null;
};

type FilmDraft = Omit<Film, "id"> & { id?: string };

const empty: FilmDraft = {
  slug: "",
  title_en: "",
  title_fa: "",
  director_en: "",
  director_fa: "",
  synopsis_en: "",
  synopsis_fa: "",
  category: "",
  year: null,
  duration_min: null,
  price_cents: 499,
  price_toman: 0,
  visibility: "draft",
  sort_order: 0,
  cover_url: "",
  video_url: "",
  preview_url: "",
};

async function listFilms(): Promise<Film[]> {
  const { data, error } = await supabase
    .from("films")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Film[]) ?? [];
}

async function listCategoryIds(): Promise<string[]> {
  const { data } = await supabase.from("categories").select("id").order("sort_order");
  return (data ?? []).map((c) => c.id);
}

function FilmsAdminPage() {
  const qc = useQueryClient();
  const { data: films = [], isLoading } = useQuery({ queryKey: ["admin", "films"], queryFn: listFilms });
  const { data: categories = [] } = useQuery({ queryKey: ["admin", "category-ids"], queryFn: listCategoryIds });

  const [editing, setEditing] = useState<FilmDraft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const save = useMutation({
    mutationFn: async (draft: FilmDraft) => {
      const payload = {
        slug: draft.slug.trim(),
        title_en: draft.title_en.trim(),
        title_fa: draft.title_fa?.trim() || null,
        director_en: draft.director_en?.trim() || null,
        director_fa: draft.director_fa?.trim() || null,
        synopsis_en: draft.synopsis_en?.trim() || null,
        synopsis_fa: draft.synopsis_fa?.trim() || null,
        category: draft.category || null,
        year: draft.year ?? null,
        duration_min: draft.duration_min ?? null,
        price_cents: Number(draft.price_cents) || 0,
        price_toman: Number(draft.price_toman) || 0,
        visibility: draft.visibility,
        sort_order: Number(draft.sort_order) || 0,
        cover_url: draft.cover_url?.trim() || null,
        video_url: draft.video_url?.trim() || null,
        preview_url: draft.preview_url?.trim() || null,
      };
      if (draft.id) {
        const { error } = await supabase.from("films").update(payload).eq("id", draft.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("films").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Film saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "films"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("films").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "films"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkVisibility = useMutation({
    mutationFn: async (args: { ids: string[]; visibility: "published" | "draft" }) => {
      const { error } = await supabase
        .from("films")
        .update({ visibility: args.visibility })
        .in("id", args.ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      toast.success(
        `${vars.ids.length} film${vars.ids.length === 1 ? "" : "s"} ${vars.visibility === "published" ? "published" : "unpublished"}`,
      );
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "films"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("films").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} film${ids.length === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "films"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const allIds = films.map((f) => f.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;
  const selectedIds = Array.from(selected);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }


  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Films</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the catalogue.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3.5 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New film
        </button>
      </header>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Director</th>
              <th className="px-4 py-3 w-24">Price</th>
              <th className="px-4 py-3 w-28">Visibility</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && films.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                No films yet. Click <span className="text-foreground">New film</span> to add one.
              </td></tr>
            )}
            {films.map((f) => {
              const isChecked = selected.has(f.id);
              return (
              <tr key={f.id} className={isChecked ? "bg-primary/5" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${f.title_en}`}
                    checked={isChecked}
                    onChange={() => toggleOne(f.id)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{f.title_en}</div>
                  {f.title_fa && <div className="text-xs text-muted-foreground" dir="rtl">{f.title_fa}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.director_en ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">${(f.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                    f.visibility === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>{f.visibility}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Link
                      to="/admin/films/$filmId/credits"
                      params={{ filmId: f.id }}
                      title="Edit credits"
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Users className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={() => setEditing(f)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button"
                      onClick={() => { if (confirm(`Delete "${f.title_en}"?`)) remove.mutate(f.id); }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-2xl">
          <span className="px-2 text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => bulkVisibility.mutate({ ids: selectedIds, visibility: "published" })}
            disabled={bulkVisibility.isPending}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Eye className="h-4 w-4" /> Publish
          </button>
          <button
            type="button"
            onClick={() => bulkVisibility.mutate({ ids: selectedIds, visibility: "draft" })}
            disabled={bulkVisibility.isPending}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <EyeOff className="h-4 w-4" /> Unpublish
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete ${selected.size} film(s)? This cannot be undone.`)) {
                bulkDelete.mutate(selectedIds);
              }
            }}
            disabled={bulkDelete.isPending}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


      {editing && (
        <FilmEditor
          draft={editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSave={(d) => save.mutate(d)}
          saving={save.isPending}
        />
      )}
    </div>
  );
}

function FilmEditor({
  draft, categories, onCancel, onSave, saving,
}: {
  draft: FilmDraft;
  categories: string[];
  onCancel: () => void;
  onSave: (d: FilmDraft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<FilmDraft>(draft);
  const set = <K extends keyof FilmDraft>(k: K, v: FilmDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-lg border border-border bg-background shadow-2xl">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{d.id ? "Edit film" : "New film"}</h2>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </header>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(d); }}
          className="p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Slug *">
              <input required value={d.slug} onChange={(e) => set("slug", e.target.value)}
                placeholder="e.g. mehrjouis-cow" className={inputCls} />
            </Field>
            <Field label="Visibility">
              <select value={d.visibility} onChange={(e) => set("visibility", e.target.value)} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="Title (EN) *">
              <input required value={d.title_en} onChange={(e) => set("title_en", e.target.value)} className={inputCls} />
            </Field>
            <Field label="عنوان (FA)">
              <input dir="rtl" value={d.title_fa ?? ""} onChange={(e) => set("title_fa", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Director (EN)">
              <input value={d.director_en ?? ""} onChange={(e) => set("director_en", e.target.value)} className={inputCls} />
            </Field>
            <Field label="کارگردان (FA)">
              <input dir="rtl" value={d.director_fa ?? ""} onChange={(e) => set("director_fa", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Synopsis (EN)">
              <textarea rows={4} value={d.synopsis_en ?? ""} onChange={(e) => set("synopsis_en", e.target.value)} className={inputCls} />
            </Field>
            <Field label="خلاصه (FA)">
              <textarea rows={4} dir="rtl" value={d.synopsis_fa ?? ""} onChange={(e) => set("synopsis_fa", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Category">
              <select value={d.category ?? ""} onChange={(e) => set("category", e.target.value || null)} className={inputCls}>
                <option value="">—</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <input type="number" value={d.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
            </Field>
            <Field label="Duration (min)">
              <input type="number" value={d.duration_min ?? ""} onChange={(e) => set("duration_min", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
            </Field>
            <Field label="Sort order">
              <input type="number" value={d.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (USD cents)">
              <input type="number" value={d.price_cents} onChange={(e) => set("price_cents", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Price (Toman)">
              <input type="number" value={d.price_toman} onChange={(e) => set("price_toman", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <div className="space-y-3">
            <Field label="Cover image URL">
              <input value={d.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Video URL (Cloudflare Stream / HLS)">
              <input value={d.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Preview clip URL (optional)">
              <input value={d.preview_url ?? ""} onChange={(e) => set("preview_url", e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
          </div>

          <footer className="pt-4 border-t border-border flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving…" : "Save film"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
