import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Check, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

type HeroBlock = { kicker: string; title: string; subtitle: string };
type SettingsBlob = {
  site_default_access: "free" | "paid";
  hero: { en: HeroBlock; fa: HeroBlock };
};

const DEFAULTS: SettingsBlob = {
  site_default_access: "paid",
  hero: {
    en: {
      kicker: "Original Iranian short films",
      title: "Cinema, in its true voice.",
      subtitle: "No subscription — pay only for what you watch.",
    },
    fa: {
      kicker: "آثار کوتاه اختصاصی ایرانی",
      title: "سینما، با صدای واقعی‌اش.",
      subtitle: "بدون اشتراک — بلیت همان فیلمی که می‌خواهید.",
    },
  },
};

async function loadSettings(): Promise<SettingsBlob> {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "settings")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as SettingsBlob) ?? DEFAULTS;
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_settings"],
    queryFn: loadSettings,
  });

  const [form, setForm] = useState<SettingsBlob>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function update<L extends "en" | "fa">(lang: L, field: keyof HeroBlock, value: string) {
    setForm((f) => ({ ...f, hero: { ...f.hero, [lang]: { ...f.hero[lang], [field]: value } } }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "settings", data: form as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["site_content", "settings"] });
    qc.invalidateQueries({ queryKey: ["admin", "site_settings"] });
    setTimeout(() => setSaved(false), 2500);
  }

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Site Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit homepage hero copy (EN/FA) and platform-wide defaults.
        </p>
      </header>

      <section className="rounded-lg border border-border p-6 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Default access mode
        </h2>
        <div className="flex gap-2">
          {(["paid", "free"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setForm((f) => ({ ...f, site_default_access: mode })); setSaved(false); }}
              className={`rounded-md border px-4 py-2 text-sm capitalize transition-colors ${
                form.site_default_access === mode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Films with <code>access_mode = "inherit"</code> use this value.
        </p>
      </section>

      {(["en", "fa"] as const).map((lang) => (
        <section key={lang} className="rounded-lg border border-border p-6 mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Hero — {lang === "en" ? "English" : "Persian (فارسی)"}
          </h2>
          <div className="space-y-4" dir={lang === "fa" ? "rtl" : "ltr"}>
            <Field
              label="Kicker"
              value={form.hero[lang].kicker}
              onChange={(v) => update(lang, "kicker", v)}
            />
            <Field
              label="Title"
              value={form.hero[lang].title}
              onChange={(v) => update(lang, "title", v)}
              textarea
            />
            <Field
              label="Subtitle"
              value={form.hero[lang].subtitle}
              onChange={(v) => update(lang, "subtitle", v)}
              textarea
            />
          </div>
        </section>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : (<><Save className="h-4 w-4" /> Save changes</>)}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {error && (
          <span className="inline-flex items-center gap-1 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}
