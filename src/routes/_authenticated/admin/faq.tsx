import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_FAQ, nid, type FaqContent } from "@/lib/cms";
import { PageHeader } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";

export const Route = createFileRoute("/_authenticated/admin/faq")({
  component: FaqPage,
});

const inp =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function FaqPage() {
  const qc = useQueryClient();
  const [value, setValueRaw] = useState<FaqContent>(DEFAULT_FAQ);
  const [lang, setLang] = useState<"en" | "fa">("en");

  function setValue(v: FaqContent) {
    setValueRaw({ heading: v.heading ?? DEFAULT_FAQ.heading, items: v.items ?? [] });
  }
  useEffect(() => {
    loadCmsKey<FaqContent>(CMS_KEYS.FAQ).then((v) => setValue(v ?? DEFAULT_FAQ));
  }, []);

  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.FAQ, value),
    onSuccess: () => {
      toast.success("FAQ saved");
      qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.FAQ] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function add() {
    setValue({
      ...value,
      items: [...value.items, { id: nid(), question: { en: "", fa: "" }, answer: { en: "", fa: "" } }],
    });
  }
  function move(i: number, d: number) {
    const next = [...value.items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setValue({ ...value, items: next });
  }
  function remove(i: number) {
    setValue({ ...value, items: value.items.filter((_, j) => j !== i) });
  }
  function patchItem(i: number, key: "question" | "answer", l: "en" | "fa", v: string) {
    setValue({
      ...value,
      items: value.items.map((x, j) => (j === i ? { ...x, [key]: { ...x[key], [l]: v } } : x)),
    });
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <PageHeader title="FAQ" subtitle="Public FAQ section. Add as many Q&A pairs as you need." />
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save FAQ"}
        </button>
      </div>

      {/* Heading — bilingual side-by-side */}
      <div className="rounded-lg border border-border bg-card/40 p-5 mb-5">
        <div className="mb-3">
          <h3 className="text-sm font-medium">Section heading</h3>
          <p className="text-xs text-muted-foreground mt-0.5">the title shown above the questions</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">English</span>
            <input
              value={value.heading.en}
              onChange={(e) => setValue({ ...value, heading: { ...value.heading, en: e.target.value } })}
              className={inp}
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 text-right">فارسی</span>
            <input
              dir="rtl"
              value={value.heading.fa}
              onChange={(e) => setValue({ ...value, heading: { ...value.heading, fa: e.target.value } })}
              className={inp}
            />
          </label>
        </div>
      </div>

      {/* Language pill */}
      <div className="inline-flex rounded-full bg-card/60 border border-border p-1 mb-4">
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

      {/* Questions list */}
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Questions</div>
        {value.items.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No questions yet. Add your first below.
          </div>
        )}
        {value.items.map((it, i) => (
          <div key={it.id} className="rounded-lg border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-primary/90">
                Question {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(i, +1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <TwoClickDelete onConfirm={() => remove(i)} iconOnly />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Question</span>
                <input
                  dir={lang === "fa" ? "rtl" : "ltr"}
                  value={lang === "en" ? it.question.en : it.question.fa}
                  onChange={(e) => patchItem(i, "question", lang, e.target.value)}
                  className={`${inp} font-medium`}
                  placeholder={lang === "en" ? "What's your question?" : "سوال شما چیست؟"}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Answer</span>
                <textarea
                  rows={4}
                  dir={lang === "fa" ? "rtl" : "ltr"}
                  value={lang === "en" ? it.answer.en : it.answer.fa}
                  onChange={(e) => patchItem(i, "answer", lang, e.target.value)}
                  className={inp}
                  placeholder={lang === "en" ? "Answer text…" : "پاسخ…"}
                />
              </label>
            </div>
          </div>
        ))}

        <div className="pt-2">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
      </div>
    </div>
  );
}
