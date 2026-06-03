import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { nid } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: PagesPage,
});

const inp =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

type BlockType = "heading" | "subheading" | "paragraph" | "quote";
type ContentBlock = { id: string; type: BlockType; en: string; fa: string };

type Page = {
  id: string;
  slug: string;
  menu_label_en: string | null;
  menu_label_fa: string | null;
  title_en: string;
  title_fa: string | null;
  blocks: ContentBlock[];
  sort_order: number;
};

const BLOCK_LABEL: Record<BlockType, string> = {
  heading: "Heading",
  subheading: "Sub-heading",
  paragraph: "Paragraph",
  quote: "Quote",
};

async function listPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, menu_label_en, menu_label_fa, title_en, title_fa, blocks, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...p, blocks: (p.blocks as ContentBlock[]) ?? [] }));
}

function PagesPage() {
  const qc = useQueryClient();
  const { data: pages = [], isLoading } = useQuery({ queryKey: ["admin", "pages"], queryFn: listPages });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "fa">("en");
  const [draft, setDraft] = useState<Page | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");

  useEffect(() => {
    if (!selectedId && pages[0]) setSelectedId(pages[0].id);
  }, [pages, selectedId]);
  useEffect(() => {
    const p = pages.find((x) => x.id === selectedId);
    if (p) setDraft(p);
  }, [selectedId, pages]);

  const create = useMutation({
    mutationFn: async (slug: string) => {
      const s = slug.trim();
      if (!s || !/^[a-z0-9-]+$/.test(s)) throw new Error("Use lowercase letters, numbers, dashes only");
      const { data, error } = await supabase
        .from("pages")
        .insert({ slug: s, title_en: s, blocks: [], sort_order: pages.length })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Page created");
      setSelectedId(id);
      setCreating(false);
      setNewSlug("");
      qc.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const save = useMutation({
    mutationFn: async (p: Page) => {
      const { error } = await supabase.from("pages").update({
        menu_label_en: p.menu_label_en, menu_label_fa: p.menu_label_fa,
        title_en: p.title_en, title_fa: p.title_fa,
        blocks: p.blocks as never, sort_order: p.sort_order,
      }).eq("id", p.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Page saved"); qc.invalidateQueries({ queryKey: ["admin", "pages"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Page deleted"); setSelectedId(null); qc.invalidateQueries({ queryKey: ["admin", "pages"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const title = useMemo(() => {
    if (!draft) return "";
    return (lang === "en" ? draft.menu_label_en : draft.menu_label_fa) || draft.title_en || draft.slug;
  }, [draft, lang]);

  function patch(b: Partial<Page>) { if (draft) setDraft({ ...draft, ...b }); }
  function patchBlock(i: number, b: Partial<ContentBlock>) {
    if (!draft) return;
    const next = [...draft.blocks];
    next[i] = { ...next[i], ...b };
    setDraft({ ...draft, blocks: next });
  }
  function moveBlock(i: number, d: number) {
    if (!draft) return;
    const next = [...draft.blocks];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setDraft({ ...draft, blocks: next });
  }
  function removeBlock(i: number) {
    if (!draft) return;
    setDraft({ ...draft, blocks: draft.blocks.filter((_, j) => j !== i) });
  }
  function addBlock(type: BlockType) {
    if (!draft) return;
    setDraft({ ...draft, blocks: [...draft.blocks, { id: nid(), type, en: "", fa: "" }] });
  }

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Pages & Text" subtitle="Edit the wording of every content page — in both languages." />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Left: page list */}
        <aside className="rounded-lg border border-border bg-card/40 p-3 sticky top-4">
          <div className="space-y-1">
            {isLoading && <div className="text-sm text-muted-foreground p-2">Loading…</div>}
            {!isLoading && pages.length === 0 && !creating && (
              <div className="text-xs text-muted-foreground p-2">No pages yet.</div>
            )}
            {pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedId === p.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">{p.menu_label_en || p.title_en || p.slug}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            {creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") create.mutate(newSlug); if (e.key === "Escape") { setCreating(false); setNewSlug(""); } }}
                  placeholder="page-slug"
                  className={inp}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => create.mutate(newSlug)} className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">Create</button>
                  <button type="button" onClick={() => { setCreating(false); setNewSlug(""); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCreating(true)} className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                <Plus className="h-4 w-4" /> New page
              </button>
            )}
          </div>
        </aside>

        {/* Right: editor */}
        <section className="min-w-0">
          {!draft && (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
              Select a page on the left or create a new one.
            </div>
          )}
          {draft && (
            <div className="space-y-5">
              {/* Editor header with Delete / Save */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{title}</h2>
                <div className="flex items-center gap-2">
                  <TwoClickDelete onConfirm={() => remove.mutate(draft.id)} label="Delete page" />
                  <button type="button" onClick={() => save.mutate(draft)} disabled={save.isPending} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    {save.isPending ? "Saving…" : "Save page"}
                  </button>
                </div>
              </div>

              {/* Menu / link name — always bilingual side-by-side */}
              <div className="rounded-lg border border-border bg-card/40 p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-medium">Menu / link name</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">how it appears in the footer & menus</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">English</span>
                    <input value={draft.menu_label_en ?? ""} onChange={(e) => patch({ menu_label_en: e.target.value })} className={inp} />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 text-right">فارسی</span>
                    <input dir="rtl" value={draft.menu_label_fa ?? ""} onChange={(e) => patch({ menu_label_fa: e.target.value })} className={inp} />
                  </label>
                </div>
              </div>

              {/* Language toggle pill */}
              <div className="inline-flex rounded-full bg-card/60 border border-border p-1">
                {(["en", "fa"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                      lang === l ? "bg-primary/90 text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l === "en" ? "English" : "فارسی"}
                  </button>
                ))}
              </div>

              {/* Page title (per language) */}
              <div className="rounded-lg border border-border bg-card/40 p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-medium">Page title</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">the large heading at the top of the page</p>
                </div>
                {lang === "en" ? (
                  <input value={draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} className={inp} />
                ) : (
                  <input dir="rtl" value={draft.title_fa ?? ""} onChange={(e) => patch({ title_fa: e.target.value })} className={inp} />
                )}
              </div>

              {/* Content blocks */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Content blocks</div>
                {draft.blocks.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No content yet. Add your first block below.
                  </div>
                )}
                {draft.blocks.map((b, i) => (
                  <div key={b.id} className="rounded-lg border border-border bg-card/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-primary/90">{BLOCK_LABEL[b.type]}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveBlock(i, -1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => moveBlock(i, +1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeBlock(i)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Remove">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {b.type === "paragraph" || b.type === "quote" ? (
                      <textarea
                        rows={4}
                        dir={lang === "fa" ? "rtl" : "ltr"}
                        value={lang === "en" ? b.en : b.fa}
                        onChange={(e) => patchBlock(i, { [lang]: e.target.value } as Partial<ContentBlock>)}
                        className={`${inp} ${b.type === "quote" ? "italic" : ""}`}
                        placeholder={b.type === "quote" ? "Quote text…" : "Paragraph text…"}
                      />
                    ) : (
                      <input
                        dir={lang === "fa" ? "rtl" : "ltr"}
                        value={lang === "en" ? b.en : b.fa}
                        onChange={(e) => patchBlock(i, { [lang]: e.target.value } as Partial<ContentBlock>)}
                        className={`${inp} ${b.type === "heading" ? "text-lg font-semibold" : "font-medium"}`}
                        placeholder={b.type === "heading" ? "Heading text" : "Sub-heading text"}
                      />
                    )}
                  </div>
                ))}

                {/* Add block toolbar */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(["heading", "subheading", "paragraph", "quote"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addBlock(t)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
                    >
                      <Plus className="h-3.5 w-3.5" /> {BLOCK_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
