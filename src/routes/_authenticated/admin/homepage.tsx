import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import {
  CMS_KEYS, DEFAULT_BUTTON_LABELS, DEFAULT_HERO, DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_SUPPORT_PAYMENTS, DEFAULT_WELCOME, DEFAULT_WHY_IRAN, nid,
  type ButtonLabels, type HeroSettings, type HomepageSection, type SiteAccessMode,
  type SupportPayments, type WelcomeScreen, type WhyIranCard,
} from "@/lib/cms";
import { BilingualField, PageHeader, Panel } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: HomepagePage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function useCmsState<T>(key: string, fallback: T) {
  const qc = useQueryClient();
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    loadCmsKey<T>(key).then((v) => { setValue(v); setLoaded(true); });
  }, [key]);
  const save = useMutation({
    mutationFn: (v: T) => saveCmsKey(key, v),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site_content", key] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return { value, setValue, loaded, save };
}

function HomepagePage() {
  return (
    <>
      <SectionTabs section="Site content" tabs={SITE_CONTENT_TABS} />
      <div className="p-8 max-w-5xl space-y-6">
        <PageHeader title="Homepage" subtitle="Control what appears on your main page." />
        <EditLaunchPanel />
        <AccessModePanel />
        <SupportPaymentsPanel />
        <HeroPanel />
        <WhyIranPanel />
        <SectionsPanel />
        <WelcomePanel />
      </div>
    </>
  );
}

function EditLaunchPanel() {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-medium">Edit website manually</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            Open your live site in private admin edit mode. Only you can see this; visitors never can.
          </p>
        </div>
        <a
          href="/#__edit"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" /> Edit Website Manually
        </a>
      </div>
    </Panel>
  );
}

function AccessModePanel() {
  const { value: mode, setValue: setMode, save: saveMode } =
    useCmsState<{ mode: SiteAccessMode }>(CMS_KEYS.ACCESS_MODE, { mode: "paid" });
  const { value: labels, setValue: setLabels, save: saveLabels } =
    useCmsState<ButtonLabels>(CMS_KEYS.BUTTON_LABELS, DEFAULT_BUTTON_LABELS);

  return (
    <Panel title="Film access mode" description="Choose how films open right now. You can switch this anytime.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["free", "paid"] as const).map((m) => (
          <label
            key={m}
            className={`cursor-pointer rounded-md border p-4 transition-colors ${
              mode.mode === m ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
            }`}
          >
            <input
              type="radio"
              checked={mode.mode === m}
              onChange={() => setMode({ mode: m })}
              className="sr-only"
            />
            <div className="text-sm font-medium">
              {m === "free" ? "Free — Watch Free + Support" : "Paid — Pay & Watch"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {m === "free"
                ? "Anyone can watch; viewers can optionally support the filmmaker."
                : "Viewers buy a ticket for each film before watching."}
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-border p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Button labels</div>
        <div className="space-y-3">
          <BilingualField label="Free button" value={labels.watch} onChange={(v) => setLabels({ ...labels, watch: v })} />
          <BilingualField label="Support button" value={labels.support} onChange={(v) => setLabels({ ...labels, support: v })} />
          <BilingualField label="Paid button" value={labels.pay} onChange={(v) => setLabels({ ...labels, pay: v })} />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => { saveMode.mutate(mode); saveLabels.mutate(labels); }}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Save access settings
        </button>
      </div>
    </Panel>
  );
}

function SupportPaymentsPanel() {
  const { value, setValue, save } = useCmsState<SupportPayments>(CMS_KEYS.SUPPORT_PAYMENTS, DEFAULT_SUPPORT_PAYMENTS);
  const [newIntl, setNewIntl] = useState("");
  const [newIr, setNewIr] = useState("");

  function addIntl() {
    const n = Number(newIntl);
    if (!n || n < 1) return;
    setValue({ ...value, intl: { ...value.intl, amounts: [...value.intl.amounts, n].sort((a,b)=>a-b) } });
    setNewIntl("");
  }
  function addIr() {
    const n = Number(newIr);
    if (!n || n < 1000) return;
    setValue({ ...value, iran: { ...value.iran, amounts: [...value.iran.amounts, n].sort((a,b)=>a-b) } });
    setNewIr("");
  }

  return (
    <Panel title="Support payments" description="When a film is in Free mode, viewers can support the filmmaker. Settings are separate for international and Iranian audiences.">
      <label className="flex items-center justify-between mb-4 p-3 rounded-md border border-border">
        <div>
          <div className="text-sm font-medium">Enable support</div>
          <div className="text-xs text-muted-foreground">Show the “Support” option on free films</div>
        </div>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
          className="h-5 w-9 accent-primary"
        />
      </label>

      <div className="rounded-md border border-border p-4 mb-4">
        <div className="font-medium mb-1">🌍 International (USD)</div>
        <div className="text-xs text-muted-foreground mb-3">Shown to visitors who chose “Global”.</div>
        <div className="flex flex-wrap gap-2">
          {value.intl.amounts.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              ${a}
              <button type="button" onClick={() => setValue({ ...value, intl: { ...value.intl, amounts: value.intl.amounts.filter((_, j) => j !== i) } })}>
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input type="number" placeholder="e.g. 5" value={newIntl} onChange={(e) => setNewIntl(e.target.value)} className={`${inp} flex-1`} />
          <button type="button" onClick={addIntl} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">+ Add</button>
        </div>
        <div className="mt-4 space-y-2">
          <Toggle label="Stripe (cards)" sub="Visa, Mastercard, Apple/Google Pay" checked={value.intl.stripe} onChange={(c) => setValue({ ...value, intl: { ...value.intl, stripe: c } })} />
          <Toggle label="PayPal" sub="PayPal balance & cards" checked={value.intl.paypal} onChange={(c) => setValue({ ...value, intl: { ...value.intl, paypal: c } })} />
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="font-medium mb-1">🇮🇷 داخل ایران (تومان)</div>
        <div className="text-xs text-muted-foreground mb-3">Shown to visitors who chose “Iran” — uses an Iranian gateway.</div>
        <div className="flex flex-wrap gap-2">
          {value.iran.amounts.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              {a.toLocaleString()}
              <button type="button" onClick={() => setValue({ ...value, iran: { ...value.iran, amounts: value.iran.amounts.filter((_, j) => j !== i) } })}>
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input type="number" placeholder="e.g. 50000" value={newIr} onChange={(e) => setNewIr(e.target.value)} className={`${inp} flex-1`} />
          <button type="button" onClick={addIr} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">+ Add</button>
        </div>
        <div className="mt-4 space-y-2">
          <Toggle label="ZarinPal" sub="درگاه پرداخت ایرانی" checked={value.iran.zarinpal} onChange={(c) => setValue({ ...value, iran: { ...value.iran, zarinpal: c } })} />
          <Toggle label="IDPay (optional)" sub="—" checked={value.iran.idpay} onChange={(c) => setValue({ ...value, iran: { ...value.iran, idpay: c } })} />
          <Toggle label="NextPay (optional)" sub="—" checked={value.iran.nextpay} onChange={(c) => setValue({ ...value, iran: { ...value.iran, nextpay: c } })} />
        </div>
      </div>

      <div className="mt-4">
        <button type="button" onClick={() => save.mutate(value)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
          Save support settings
        </button>
      </div>
    </Panel>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-8 accent-primary" />
    </label>
  );
}

function HeroPanel() {
  const { value, setValue, save } = useCmsState<HeroSettings>(CMS_KEYS.HERO, DEFAULT_HERO);
  const [films, setFilms] = useState<{ slug: string; title_en: string }[]>([]);
  useEffect(() => {
    supabase.from("films").select("slug, title_en").eq("visibility", "published")
      .then(({ data }) => setFilms(data ?? []));
  }, []);
  return (
    <Panel title="Hero section">
      <label className="block mb-4">
        <span className="block text-xs font-medium text-muted-foreground mb-1.5">Featured film</span>
        <select value={value.featuredFilmSlug ?? ""} onChange={(e) => setValue({ ...value, featuredFilmSlug: e.target.value || null })} className={inp}>
          <option value="">— None —</option>
          {films.map((f) => <option key={f.slug} value={f.slug}>{f.title_en}</option>)}
        </select>
      </label>
      <div className="space-y-3">
        <BilingualField label="Kicker" value={value.kicker} onChange={(v) => setValue({ ...value, kicker: v })} />
        <BilingualField label="Heading" value={value.heading} onChange={(v) => setValue({ ...value, heading: v })} textarea />
      </div>
      <button type="button" onClick={() => save.mutate(value)} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save hero</button>
    </Panel>
  );
}

function WhyIranPanel() {
  const { value, setValue, save } = useCmsState<{ cards: WhyIranCard[] }>(CMS_KEYS.WHY_IRAN, DEFAULT_WHY_IRAN);
  function updateCard(i: number, patch: Partial<WhyIranCard>) {
    setValue({ cards: value.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }
  function addCard() {
    setValue({ cards: [...value.cards, { icon: "✨", heading: { en: "", fa: "" }, body: { en: "", fa: "" } }] });
  }
  function removeCard(i: number) {
    setValue({ cards: value.cards.filter((_, j) => j !== i) });
  }
  return (
    <Panel title="Why IRAN cards">
      <div className="space-y-4">
        {value.cards.map((c, i) => (
          <div key={i} className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input value={c.icon} onChange={(e) => updateCard(i, { icon: e.target.value })} className={`${inp} w-20`} placeholder="🎬" />
              <button type="button" onClick={() => removeCard(i)} className="text-xs text-muted-foreground hover:text-destructive">Remove card</button>
            </div>
            <BilingualField label="Heading" value={c.heading} onChange={(v) => updateCard(i, { heading: v })} />
            <BilingualField label="Body" value={c.body} onChange={(v) => updateCard(i, { body: v })} textarea />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={addCard} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          <Plus className="h-4 w-4" /> Add card
        </button>
        <button type="button" onClick={() => save.mutate(value)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save cards</button>
      </div>
    </Panel>
  );
}

function SectionsPanel() {
  const { value, setValue, save } = useCmsState<{ sections: HomepageSection[] }>(
    CMS_KEYS.HOMEPAGE_SECTIONS,
    { sections: DEFAULT_HOMEPAGE_SECTIONS },
  );
  function move(i: number, delta: number) {
    const next = [...value.sections];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setValue({ sections: next });
  }
  function toggleHidden(i: number) {
    setValue({ sections: value.sections.map((s, j) => j === i ? { ...s, hidden: !s.hidden } : s) });
  }
  function remove(i: number) {
    setValue({ sections: value.sections.filter((_, j) => j !== i) });
  }
  function add(type: HomepageSection["type"]) {
    setValue({ sections: [...value.sections, { id: nid(), type } as HomepageSection] });
  }
  return (
    <Panel title="Homepage sections" description="Add, reorder, hide, or remove sections that appear on the homepage.">
      <div className="space-y-2">
        {value.sections.map((s, i) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 ${s.hidden ? "opacity-50" : ""}`}>
            <span className="text-xs text-muted-foreground tabular-nums w-6">{i + 1}</span>
            <span className="text-sm font-medium capitalize flex-1">{s.type}</span>
            <button type="button" onClick={() => move(i, -1)} className="text-xs text-muted-foreground hover:text-foreground px-1.5">↑</button>
            <button type="button" onClick={() => move(i, +1)} className="text-xs text-muted-foreground hover:text-foreground px-1.5">↓</button>
            <button type="button" onClick={() => toggleHidden(i)} className="text-xs text-muted-foreground hover:text-foreground px-2">{s.hidden ? "Show" : "Hide"}</button>
            <button type="button" onClick={() => remove(i)} className="text-xs text-muted-foreground hover:text-destructive px-2">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        {(["hero", "features", "filmrow", "textband", "signup"] as const).map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
            + {t}
          </button>
        ))}
        <button type="button" onClick={() => save.mutate(value)} className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save sections</button>
      </div>
    </Panel>
  );
}

function WelcomePanel() {
  const { value, setValue, save } = useCmsState<WelcomeScreen>(CMS_KEYS.WELCOME, DEFAULT_WELCOME);
  return (
    <Panel title="Welcome screen text" description="Shown the first time a visitor arrives.">
      <div className="space-y-3">
        <BilingualField label="Heading" value={value.heading} onChange={(v) => setValue({ ...value, heading: v })} />
        <BilingualField label="Global button" value={value.buttonGlobal} onChange={(v) => setValue({ ...value, buttonGlobal: v })} />
        <BilingualField label="Iran button" value={value.buttonIran} onChange={(v) => setValue({ ...value, buttonIran: v })} />
      </div>
      <button type="button" onClick={() => save.mutate(value)} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">Save welcome</button>
    </Panel>
  );
}
