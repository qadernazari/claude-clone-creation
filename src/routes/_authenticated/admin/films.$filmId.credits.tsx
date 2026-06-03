import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/admin/films/$filmId/credits")({
  component: CreditsPage,
});

const CREDIT_TYPES = ["cast", "crew", "music", "production", "other"] as const;
type CreditType = (typeof CREDIT_TYPES)[number];

type Credit = {
  id: string;
  film_id: string;
  credit_type: string;
  label_en: string | null;
  label_fa: string | null;
  value_en: string | null;
  value_fa: string | null;
  sort_order: number;
};

type Draft = Omit<Credit, "id" | "film_id"> & { id?: string };

const emptyDraft: Draft = {
  credit_type: "cast",
  label_en: "",
  label_fa: "",
  value_en: "",
  value_fa: "",
  sort_order: 0,
};

function CreditsPage() {
  const { filmId } = Route.useParams();
  const qc = useQueryClient();

  const { data: film } = useQuery({
    queryKey: ["admin", "film", filmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select("id, title_en, title_fa, slug")
        .eq("id", filmId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ["admin", "credits", filmId],
    queryFn: async (): Promise<Credit[]> => {
      const { data, error } = await supabase
        .from("film_credits")
        .select("*")
        .eq("film_id", filmId)
        .order("credit_type")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data as Credit[]) ?? [];
    },
  });

  const [editing, setEditing] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        film_id: filmId,
        credit_type: d.credit_type,
        label_en: d.label_en?.trim() || null,
        label_fa: d.label_fa?.trim() || null,
        value_en: d.value_en?.trim() || null,
        value_fa: d.value_fa?.trim() || null,
        sort_order: Number(d.sort_order) || 0,
      };
      if (d.id) {
        const { error } = await supabase.from("film_credits").update(payload).eq("id", d.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("film_credits").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Credit saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "credits", filmId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("film_credits").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "credits", filmId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map((u) =>
          supabase.from("film_credits").update({ sort_order: u.sort_order }).eq("id", u.id),
        ),
      );
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["admin", "credits", filmId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(type: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const current = credits.filter((c) => c.credit_type === type);
    const oldIndex = current.findIndex((c) => c.id === active.id);
    const newIndex = current.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(current, oldIndex, newIndex);
    const updates = reordered.map((c, i) => ({ id: c.id, sort_order: i }));

    // Optimistic cache update
    qc.setQueryData<Credit[]>(["admin", "credits", filmId], (prev) => {
      if (!prev) return prev;
      const others = prev.filter((c) => c.credit_type !== type);
      const next = reordered.map((c, i) => ({ ...c, sort_order: i }));
      return [...others, ...next].sort(
        (a, b) =>
          a.credit_type.localeCompare(b.credit_type) || a.sort_order - b.sort_order,
      );
    });

    reorder.mutate(updates);
  }

  const grouped = CREDIT_TYPES.map((t) => ({
    type: t,
    items: credits.filter((c) => c.credit_type === t),
  }));

  return (
    <div className="p-8 max-w-5xl">
      <Link
        to="/admin/films"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to films
      </Link>

      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Credits</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {film?.title_en ?? "…"}
          </h1>
          {film?.title_fa && (
            <p className="text-sm text-muted-foreground" dir="rtl">{film.title_fa}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...emptyDraft })}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3.5 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add credit
        </button>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && credits.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No credits yet. Click <span className="text-foreground">Add credit</span> to start.
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(({ type, items }) =>
          items.length === 0 ? null : (
            <section key={type} className="rounded-lg border border-border overflow-hidden">
              <header className="px-4 py-2.5 bg-card/60 text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{type}</span>
                <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                  Drag the handle to reorder
                </span>
              </header>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(type, e)}
              >
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border">
                    {items.map((c) => (
                      <SortableRow
                        key={c.id}
                        credit={c}
                        onEdit={() => setEditing(c)}
                        onRemove={() => {
                          if (confirm("Remove this credit?")) remove.mutate(c.id);
                        }}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </section>
          )
        )}
      </div>


      {editing && (
        <CreditEditor
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={(d) => save.mutate(d)}
          saving={save.isPending}
        />
      )}
    </div>
  );
}

function CreditEditor({
  draft,
  onCancel,
  onSave,
  saving,
}: {
  draft: Draft;
  onCancel: () => void;
  onSave: (d: Draft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8 rounded-lg border border-border bg-background shadow-2xl">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{d.id ? "Edit credit" : "New credit"}</h2>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </header>
        <form onSubmit={(e) => { e.preventDefault(); onSave(d); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={d.credit_type}
                onChange={(e) => set("credit_type", e.target.value as CreditType)}
                className={inputCls}
              >
                {CREDIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={d.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Label (EN)">
              <input
                value={d.label_en ?? ""}
                onChange={(e) => set("label_en", e.target.value)}
                placeholder="e.g. Director of Photography"
                className={inputCls}
              />
            </Field>
            <Field label="برچسب (FA)">
              <input
                dir="rtl"
                value={d.label_fa ?? ""}
                onChange={(e) => set("label_fa", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Value (EN)">
              <input
                value={d.value_en ?? ""}
                onChange={(e) => set("value_en", e.target.value)}
                placeholder="e.g. Houshang Baharlou"
                className={inputCls}
              />
            </Field>
            <Field label="مقدار (FA)">
              <input
                dir="rtl"
                value={d.value_fa ?? ""}
                onChange={(e) => set("value_fa", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <footer className="pt-4 border-t border-border flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save credit"}
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
