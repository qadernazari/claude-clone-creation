import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_FOOTER, nid, type FooterContent } from "@/lib/cms";
import { BilingualField, PageHeader, Panel } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { SectionTabs, SITE_CONTENT_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/footer")({
  component: FooterPage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function FooterPage() {
  const qc = useQueryClient();
  const [value, setValue] = useState<FooterContent>(DEFAULT_FOOTER);
  useEffect(() => { loadCmsKey<FooterContent>(CMS_KEYS.FOOTER).then(setValue); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.FOOTER, value),
    onSuccess: () => { toast.success("Footer saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.FOOTER] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  function addColumn() {
    setValue({ ...value, columns: [...value.columns, { id: nid(), heading: { en: "Column", fa: "ستون" }, links: [] }] });
  }
  function updateColumn(i: number, patch: Partial<FooterContent["columns"][number]>) {
    setValue({ ...value, columns: value.columns.map((c, j) => j === i ? { ...c, ...patch } : c) });
  }
  return (
    <>
      <SectionTabs section="Site content" tabs={SITE_CONTENT_TABS} />
    <div className="p-8 max-w-5xl space-y-4">
      <PageHeader title="Footer & Links" subtitle="Edit the site footer columns and links." />
      <Panel title="Columns">
        <div className="space-y-4">
          {value.columns.map((c, i) => (
            <div key={c.id} className="rounded-md border border-border p-4">
              <BilingualField label="Column heading" value={c.heading} onChange={(v) => updateColumn(i, { heading: v })} />
              <div className="mt-3 space-y-3">
                {c.links.map((l, li) => (
                  <div key={l.id} className="rounded-md border border-border/60 p-3">
                    <BilingualField label="Link label" value={l.label} onChange={(v) => updateColumn(i, { links: c.links.map((x, j) => j === li ? { ...x, label: v } : x) })} />
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                      <label className="block">
                        <span className="block text-xs font-medium text-muted-foreground mb-1.5">URL / href</span>
                        <input value={l.href} onChange={(e) => updateColumn(i, { links: c.links.map((x, j) => j === li ? { ...x, href: e.target.value } : x) })} className={inp} placeholder="/about or https://…" />
                      </label>
                      <TwoClickDelete onConfirm={() => updateColumn(i, { links: c.links.filter((_, j) => j !== li) })} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => updateColumn(i, { links: [...c.links, { id: nid(), label: { en: "Link", fa: "پیوند" }, href: "" }] })} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                  <Plus className="h-3.5 w-3.5" /> Add link
                </button>
              </div>
              <div className="mt-3 flex justify-end">
                <TwoClickDelete onConfirm={() => setValue({ ...value, columns: value.columns.filter((_, j) => j !== i) })} label="Delete column" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button type="button" onClick={addColumn} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
            <Plus className="h-4 w-4" /> Add column
          </button>
        </div>
      </Panel>
      <Panel title="Copyright">
        <BilingualField label="Copyright text" value={value.copyright} onChange={(v) => setValue({ ...value, copyright: v })} />
      </Panel>
      <div className="flex">
        <button type="button" onClick={() => save.mutate()} className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save footer</button>
      </div>
    </div>
  );
}
