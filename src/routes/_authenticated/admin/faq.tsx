import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_FAQ, nid, type FaqContent } from "@/lib/cms";
import { BilingualField, PageHeader, Panel } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";

export const Route = createFileRoute("/_authenticated/admin/faq")({
  component: FaqPage,
});

function FaqPage() {
  const qc = useQueryClient();
  const [value, setValueRaw] = useState<FaqContent>(DEFAULT_FAQ);
  const setValue = (v: FaqContent) => setValueRaw({ heading: v.heading ?? DEFAULT_FAQ.heading, items: v.items ?? [] });
  useEffect(() => { loadCmsKey<FaqContent>(CMS_KEYS.FAQ).then((v) => setValue(v ?? DEFAULT_FAQ)); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.FAQ, value),
    onSuccess: () => { toast.success("FAQ saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.FAQ] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  function add() {
    setValue({ ...value, items: [...value.items, { id: nid(), question: { en: "", fa: "" }, answer: { en: "", fa: "" } }] });
  }
  function move(i: number, d: number) {
    const next = [...value.items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setValue({ ...value, items: next });
  }
  return (
    <div className="p-8 max-w-4xl space-y-4">
      <PageHeader title="FAQ" subtitle="Public FAQ section. Add as many Q&A pairs as you need." />
      <Panel title="Heading">
        <BilingualField label="FAQ heading" value={value.heading} onChange={(v) => setValue({ ...value, heading: v })} />
      </Panel>
      <Panel title="Questions">
        <div className="space-y-3">
          {value.items.map((it, i) => (
            <div key={it.id} className="rounded-md border border-border p-4 space-y-3">
              <BilingualField label="Question" value={it.question} onChange={(v) => setValue({ ...value, items: value.items.map((x, j) => j === i ? { ...x, question: v } : x) })} />
              <BilingualField label="Answer" value={it.answer} onChange={(v) => setValue({ ...value, items: value.items.map((x, j) => j === i ? { ...x, answer: v } : x) })} textarea rows={4} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => move(i, -1)} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">↑</button>
                <button type="button" onClick={() => move(i, +1)} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">↓</button>
                <TwoClickDelete onConfirm={() => setValue({ ...value, items: value.items.filter((_, j) => j !== i) })} />
              </div>
            </div>
          ))}
          {value.items.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 text-center">No questions yet.</div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
            <Plus className="h-4 w-4" /> Add question
          </button>
          <button type="button" onClick={() => save.mutate()} className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save FAQ</button>
        </div>
      </Panel>
    </div>
  );
}
