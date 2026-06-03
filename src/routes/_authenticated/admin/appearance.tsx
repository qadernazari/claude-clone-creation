import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, DEFAULT_APPEARANCE, type Appearance } from "@/lib/cms";
import { PageHeader, Panel } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/appearance")({
  component: AppearancePage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary font-mono";

function AppearancePage() {
  const qc = useQueryClient();
  const [value, setValue] = useState<Appearance>(DEFAULT_APPEARANCE);
  useEffect(() => { loadCmsKey<Appearance>(CMS_KEYS.APPEARANCE).then(setValue); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.APPEARANCE, value),
    onSuccess: () => { toast.success("Appearance saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.APPEARANCE] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const fields: { k: keyof Appearance; label: string }[] = [
    { k: "primary", label: "Primary" },
    { k: "accent", label: "Accent" },
    { k: "background", label: "Background" },
    { k: "foreground", label: "Foreground (text)" },
  ];

  return (
    <div className="p-8 max-w-3xl space-y-4">
      <PageHeader title="Appearance" subtitle="Brand colours. Saved values are read by the public site theme." />
      <Panel title="Brand colours">
        <p className="text-xs text-muted-foreground mb-4">
          Stored as hex strings. Live preview on the public site is wired separately —
          treat this as a placeholder until full theme tokens are connected.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <label key={f.k} className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</span>
              <div className="flex gap-2 items-center">
                <input type="color" value={value[f.k]} onChange={(e) => setValue({ ...value, [f.k]: e.target.value })} className="h-10 w-12 rounded border border-border" />
                <input value={value[f.k]} onChange={(e) => setValue({ ...value, [f.k]: e.target.value })} className={inp} />
              </div>
            </label>
          ))}
        </div>
        <button type="button" onClick={() => save.mutate()} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save appearance</button>
      </Panel>
    </div>
  );
}
