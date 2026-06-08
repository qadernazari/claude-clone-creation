import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_MENU, nid, type MenuItem } from "@/lib/cms";
import { BilingualField, PageHeader, Panel } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { SectionTabs, SITE_CONTENT_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: MenuPage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function MenuPage() {
  const qc = useQueryClient();
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_MENU.items);
  useEffect(() => { loadCmsKey<{ items: MenuItem[] }>(CMS_KEYS.MENU).then((v) => setItems(v.items)); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.MENU, { items }),
    onSuccess: () => { toast.success("Menu saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.MENU] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function add() {
    setItems([...items, { id: nid(), label: { en: "New item", fa: "آیتم جدید" }, linkTo: "home" }]);
  }
  function update(i: number, patch: Partial<MenuItem>) {
    setItems(items.map((m, j) => j === i ? { ...m, ...patch } : m));
  }
  function move(i: number, d: number) {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }

  return (
    <>
      <SectionTabs section="Site content" tabs={SITE_CONTENT_TABS} />
    <div className="p-8 max-w-4xl space-y-4">
      <PageHeader title="Menu / Navigation" subtitle="Order and label the items in the public site's top menu." />
      <Panel>
        <div className="space-y-3">
          {items.map((m, i) => (
            <div key={m.id} className="rounded-md border border-border p-4">
              <BilingualField label="Label" value={m.label} onChange={(v) => update(i, { label: v })} />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">Links to</span>
                  <select value={m.linkTo} onChange={(e) => update(i, { linkTo: e.target.value })} className={inp}>
                    <option value="home">Home</option>
                    <option value="originals">Originals</option>
                    <option value="about">About</option>
                    <option value="contact">Contact</option>
                    <option value="faq">FAQ</option>
                  </select>
                </label>
                <div className="flex gap-2 sm:col-span-2 justify-end">
                  <button type="button" onClick={() => move(i, -1)} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">↑ Up</button>
                  <button type="button" onClick={() => move(i, +1)} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">↓ Down</button>
                  <TwoClickDelete onConfirm={() => setItems(items.filter((_, j) => j !== i))} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
            <Plus className="h-4 w-4" /> Add menu item
          </button>
          <button type="button" onClick={() => save.mutate()} className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save menu</button>
        </div>
      </Panel>
    </div>
    </>
  );
}
