import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_BANNER, type BannerContent } from "@/lib/cms";
import { BilingualField, PageHeader, Panel } from "@/components/admin/bilingual-field";
import { SectionTabs, SITE_CONTENT_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/banner")({
  component: BannerPage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function BannerPage() {
  const qc = useQueryClient();
  const [value, setValue] = useState<BannerContent>(DEFAULT_BANNER);
  useEffect(() => { loadCmsKey<BannerContent>(CMS_KEYS.BANNER).then(setValue); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.BANNER, value),
    onSuccess: () => { toast.success("Banner saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.BANNER] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const toneClass: Record<BannerContent["tone"], string> = {
    info: "bg-primary/15 text-primary",
    warning: "bg-amber-500/15 text-amber-400",
    success: "bg-emerald-500/15 text-emerald-400",
  };
  return (
    <>
      <SectionTabs section="Site content" tabs={SITE_CONTENT_TABS} />
    <div className="p-8 max-w-4xl space-y-4">
      <PageHeader title="Banner" subtitle="A site-wide announcement bar shown at the top of every page." />
      <Panel>
        <label className="flex items-center justify-between mb-4 p-3 rounded-md border border-border">
          <div>
            <div className="text-sm font-medium">Show announcement bar</div>
            <div className="text-xs text-muted-foreground">Toggle to hide without losing the text.</div>
          </div>
          <input type="checkbox" checked={value.enabled} onChange={(e) => setValue({ ...value, enabled: e.target.checked })} className="h-5 w-9 accent-primary" />
        </label>
        <BilingualField label="Banner text" value={value.text} onChange={(v) => setValue({ ...value, text: v })} />
        <div className="mt-4">
          <BilingualField label="CTA label (optional)" value={value.ctaLabel} onChange={(v) => setValue({ ...value, ctaLabel: v })} />
          <label className="block mt-3">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">CTA URL</span>
            <input value={value.ctaHref} onChange={(e) => setValue({ ...value, ctaHref: e.target.value })} placeholder="/originals" className={inp} />
          </label>
          <label className="block mt-3">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Tone</span>
            <select value={value.tone} onChange={(e) => setValue({ ...value, tone: e.target.value as BannerContent["tone"] })} className={inp}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
            </select>
          </label>
        </div>
        <div className={`mt-4 rounded-md px-4 py-2 text-sm ${toneClass[value.tone]}`}>
          Preview: {value.text.en || "—"} {value.ctaLabel.en && <span className="ml-2 underline">{value.ctaLabel.en}</span>}
        </div>
        <button type="button" onClick={() => save.mutate()} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save banner</button>
      </Panel>
    </div>
  );
}
