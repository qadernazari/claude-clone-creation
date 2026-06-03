import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BilingualField, PageHeader } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { nid } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: PagesPage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

type ContentBlock =
  | { id: string; type: "heading"; en: string; fa: string }
  | { id: string; type: "paragraph"; en: string; fa: string };

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

  useEffect(() => {
    if (!selectedId && pages[0]) setSelectedId(pages[0].id);
  }, [pages, selectedId]);
  useEffect(() => {
    const p = pages.find((x) => x.id === selectedId);
    if (p) setDraft(p);
  }, [selectedId, pages]);

  const create = useMutation({
    mutationFn: async () => {
      const slug = prompt("New page slug (URL-safe, e.g. 'about'):")?.trim();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid slug");
      const { data, error } = await supabase
        .from("pages")
        .insert({ slug, title_en: slug, blocks: [], sort_order: pages.length })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => { toast.success("Page created"); setSelectedId(id); qc.invalidateQueries({ queryKey: ["admin", "pages"] }); },
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

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Pages & Text" subtitle="Create and edit static pages (About, FAQ, Privacy, Terms…)." />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <aside className="rounded-lg border border-border bg-card/40 p-3 sticky top-4">
          <button type="button" onClick={() => create.mutate()} className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> New page
          </button>
          <div className="mt-3 space-y-1">
            {isLoading && <div className="text-sm text-muted-foreground p-2">Loading…</div>}
            {!isLoading && pages.length === 0 && (
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
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{p.title_en || p.slug}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {!draft && (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
              Select a page on the left or create a new one.
            </div>
          )}
          {draft && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-card/40 p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-xs font-medium text-muted-foreground mb-1.5">Slug (URL)</span>
                    <input value={draft.slug} disabled className={`${inp} text-muted-foreground`} />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-muted-foreground mb-1.5">Sort order</span>
                    <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className={inp} />
                  </label>
                </div>
                <BilingualField
                  label="Menu / link name"
                  value={{ en: draft.menu_label_en ?? "", fa: draft.menu_label_fa ?? "" }}
                  onChange={(v) => setDraft({ ...draft, menu_label_en: v.en, menu_label_fa: v.fa })}
                />
                <BilingualField
                  label="Page title"
                  value={{ en: draft.title_en, fa: draft.title_fa ?? "" }}
                  onChange={(v) => setDraft({ ...draft, title_en: v.en, title_fa: v.fa })}
                />
              </div>

              <div className="rounded-lg border border-border bg-card/40 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-medium">Content blocks</h3>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {(["en", "fa"] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-xs ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                        {l === "en" ? "EN" : "FA"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {draft.blocks.map((b, i) => (
                    <div key={b.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{b.type}</span>
                        <div className="flex gap-2 items-center">
                          <button type="button" onClick={() => {
                            const next = [...draft.blocks];
                            if (i === 0) return;
                            [next[i], next[i-1]] = [next[i-1], next[i]];
                            setDraft({ ...draft, blocks: next });
                          }} className="text-xs text-muted-foreground hover:text-foreground">↑</button>
                          <button type="button" onClick={() => {
                            const next = [...draft.blocks];
                            if (i === next.length - 1) return;
                            [next[i], next[i+1]] = [next[i+1], next[i]];
                            setDraft({ ...draft, blocks: next });
                          }} className="text-xs text-muted-foreground hover:text-foreground">↓</button>
                          <button type="button" onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, j) => j !== i) })} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                        </div>
                      </div>
                      {b.type === "heading" ? (
                        <input
                          value={lang === "en" ? b.en : b.fa}
                          dir={lang === "fa" ? "rtl" : "ltr"}
                          onChange={(e) => {
                            const next = [...draft.blocks];
                            (next[i] as ContentBlock & Record<string, string>)[lang] = e.target.value;
                            setDraft({ ...draft, blocks: next });
                          }}
                          className={`${inp} text-lg font-semibold`}
                          placeholder="Heading text"
                        />
                      ) : (
                        <textarea
                          value={lang === "en" ? b.en : b.fa}
                          dir={lang === "fa" ? "rtl" : "ltr"}
                          rows={4}
                          onChange={(e) => {
                            const next = [...draft.blocks];
                            (next[i] as ContentBlock & Record<string, string>)[lang] = e.target.value;
                            setDraft({ ...draft, blocks: next });
                          }}
                          className={inp}
                          placeholder="Paragraph text"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, { id: nid(), type: "heading", en: "", fa: "" }] })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">+ Heading</button>
                  <button type="button" onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, { id: nid(), type: "paragraph", en: "", fa: "" }] })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">+ Paragraph</button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => save.mutate(draft)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save page</button>
                <div className="flex-1" />
                <TwoClickDelete onConfirm={() => remove.mutate(draft.id)} label="Delete page" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
