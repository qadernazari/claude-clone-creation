import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, X } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, type PagesContent, type PageEntry, type PageCard, type PageLang } from "@/lib/cms";
import { PageHeader } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { SectionTabs, SITE_CONTENT_TABS } from "@/components/admin/section-tabs";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: PagesPage,
});

const inp =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

const ICON_OPTIONS = ["account", "ticket", "billing", "help", "press"] as const;

const EMPTY_LANG: PageLang = { kicker: "", title: "", body: "" };

function emptyEntry(slug: string): PageEntry {
  return {
    nameEn: slug,
    nameFa: slug,
    en: { ...EMPTY_LANG },
    fa: { ...EMPTY_LANG },
  };
}

function PagesPage() {
  const qc = useQueryClient();
  const { data: loaded } = useQuery({
    queryKey: ["site_content", CMS_KEYS.PAGES],
    queryFn: () => loadCmsKey<PagesContent>(CMS_KEYS.PAGES),
  });

  const [value, setValue] = useState<PagesContent>({});
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "fa">("en");
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");

  useEffect(() => {
    if (loaded) setValue(loaded);
  }, [loaded]);

  const slugs = useMemo(() => Object.keys(value).sort(), [value]);

  useEffect(() => {
    if (!selectedSlug && slugs[0]) setSelectedSlug(slugs[0]);
    if (selectedSlug && !value[selectedSlug] && slugs[0]) setSelectedSlug(slugs[0]);
  }, [slugs, selectedSlug, value]);

  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.PAGES, value),
    onSuccess: () => {
      toast.success("Pages saved");
      qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.PAGES] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function createPage() {
    const s = newSlug.trim().toLowerCase();
    if (!s || !/^[a-z0-9-]+$/.test(s)) {
      toast.error("Use lowercase letters, numbers, dashes only");
      return;
    }
    if (value[s]) {
      toast.error("A page with that slug already exists");
      return;
    }
    setValue({ ...value, [s]: emptyEntry(s) });
    setSelectedSlug(s);
    setCreating(false);
    setNewSlug("");
  }

  function deletePage(slug: string) {
    const next = { ...value };
    delete next[slug];
    setValue(next);
    setSelectedSlug(null);
  }

  const entry = selectedSlug ? value[selectedSlug] : null;

  function patchEntry(b: Partial<PageEntry>) {
    if (!entry || !selectedSlug) return;
    setValue({ ...value, [selectedSlug]: { ...entry, ...b } });
  }
  function patchLang(l: "en" | "fa", b: Partial<PageLang>) {
    if (!entry || !selectedSlug) return;
    setValue({
      ...value,
      [selectedSlug]: { ...entry, [l]: { ...entry[l], ...b } },
    });
  }
  function patchCard(l: "en" | "fa", i: number, b: Partial<PageCard>) {
    if (!entry || !selectedSlug) return;
    const cards = [...(entry[l].cards ?? [])];
    cards[i] = { ...cards[i], ...b };
    patchLang(l, { cards });
  }
  function addCard(l: "en" | "fa") {
    if (!entry) return;
    const cards = [...(entry[l].cards ?? []), { icon: "help", heading: "", desc: "" }];
    patchLang(l, { cards });
  }
  function removeCard(l: "en" | "fa", i: number) {
    if (!entry) return;
    const cards = (entry[l].cards ?? []).filter((_, j) => j !== i);
    patchLang(l, { cards });
  }

  return (
    <>
      <SectionTabs section="Site content" tabs={SITE_CONTENT_TABS} />
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <PageHeader title="Pages & Text" subtitle="About, FAQ entry-points, legal, help — both languages." />
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save all pages"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <aside className="rounded-lg border border-border bg-card/40 p-3 sticky top-4">
          <div className="space-y-1">
            {slugs.length === 0 && !creating && (
              <div className="text-xs text-muted-foreground p-2">No pages yet.</div>
            )}
            {slugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedSlug(slug)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedSlug === slug ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">{value[slug].nameEn || slug}</span>
                <span className="ml-auto text-[10px] opacity-50">/{slug}</span>
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
                  onKeyDown={(e) => { if (e.key === "Enter") createPage(); if (e.key === "Escape") { setCreating(false); setNewSlug(""); } }}
                  placeholder="page-slug"
                  className={inp}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={createPage} className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">Create</button>
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

        <section className="min-w-0">
          {!entry && (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
              Select a page on the left or create a new one. Don't forget to click "Save all pages" when finished.
            </div>
          )}
          {entry && selectedSlug && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">/{selectedSlug}</h2>
                <TwoClickDelete onConfirm={() => deletePage(selectedSlug)} label="Delete page" />
              </div>

              <div className="rounded-lg border border-border bg-card/40 p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-medium">Menu / link name</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">how it appears in the footer & menus</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">English</span>
                    <input value={entry.nameEn} onChange={(e) => patchEntry({ nameEn: e.target.value })} className={inp} />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 text-right">فارسی</span>
                    <input dir="rtl" value={entry.nameFa} onChange={(e) => patchEntry({ nameFa: e.target.value })} className={inp} />
                  </label>
                </div>
              </div>

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

              <div className="rounded-lg border border-border bg-card/40 p-5 space-y-4">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kicker (small eyebrow)</span>
                  <input
                    dir={lang === "fa" ? "rtl" : "ltr"}
                    value={entry[lang].kicker}
                    onChange={(e) => patchLang(lang, { kicker: e.target.value })}
                    className={inp}
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Page title</span>
                  <input
                    dir={lang === "fa" ? "rtl" : "ltr"}
                    value={entry[lang].title}
                    onChange={(e) => patchLang(lang, { title: e.target.value })}
                    className={`${inp} text-lg font-semibold`}
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Body (HTML — use &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a class="inline"&gt;)
                  </span>
                  <textarea
                    rows={12}
                    dir={lang === "fa" ? "rtl" : "ltr"}
                    value={entry[lang].body}
                    onChange={(e) => patchLang(lang, { body: e.target.value })}
                    className={`${inp} font-mono text-xs`}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-border bg-card/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium">Info cards (optional)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">3 cards shown above the body (used by Help, Contact)</p>
                  </div>
                  <button type="button" onClick={() => addCard(lang)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                    <Plus className="h-3.5 w-3.5" /> Add card
                  </button>
                </div>
                <div className="space-y-3">
                  {(entry[lang].cards ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground">No cards on this page.</div>
                  )}
                  {(entry[lang].cards ?? []).map((c, i) => (
                    <div key={i} className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-primary/90">Card {i + 1}</span>
                        <button type="button" onClick={() => removeCard(lang, i)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                        <select
                          value={c.icon}
                          onChange={(e) => patchCard(lang, i, { icon: e.target.value })}
                          className={inp}
                        >
                          {ICON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input
                          dir={lang === "fa" ? "rtl" : "ltr"}
                          value={c.heading}
                          onChange={(e) => patchCard(lang, i, { heading: e.target.value })}
                          placeholder="Heading"
                          className={`${inp} font-medium`}
                        />
                      </div>
                      <textarea
                        rows={2}
                        dir={lang === "fa" ? "rtl" : "ltr"}
                        value={c.desc ?? c.address ?? ""}
                        onChange={(e) => patchCard(lang, i, c.address !== undefined ? { address: e.target.value } : { desc: e.target.value })}
                        placeholder={c.address !== undefined ? "Address (email, phone)" : "Description"}
                        className={inp}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
    </>
  );
}
