import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, ExternalLink } from "lucide-react";
import { loadCmsKey, saveCmsKey } from "@/lib/cms-client";
import {
  CMS_KEYS, DEFAULT_PAYMENT_PROVIDER_IDS, type PaymentProviderIds,
} from "@/lib/cms";
import { PageHeader, Panel } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

type GeneralSettings = {
  apiUrl: string;
  siteUrl: string;
  defaultPriceCents: number;
  defaultPriceToman: number;
  defaultTicketHours: number;
};

const GENERAL_KEY = "general_settings";
const DEFAULT_GENERAL: GeneralSettings = {
  apiUrl: "", siteUrl: "", defaultPriceCents: 499, defaultPriceToman: 120000, defaultTicketHours: 48,
};

function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl space-y-4">
      <PageHeader title="Settings" subtitle="Connect your backend and configure the platform." />
      <GeneralPanel />
      <PaymentProvidersPanel />
    </div>
  );
}

function GeneralPanel() {
  const qc = useQueryClient();
  const [v, setV] = useState<GeneralSettings>(DEFAULT_GENERAL);
  useEffect(() => { loadCmsKey<GeneralSettings>(GENERAL_KEY).then(setV); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(GENERAL_KEY, v),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site_content", GENERAL_KEY] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="API connection" description="Where this panel sends its requests.">
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">API base URL</span>
          <input value={v.apiUrl} onChange={(e) => setV({ ...v, apiUrl: e.target.value })} placeholder="https://your-api.com/api" className={inp} />
        </label>
        <label className="block mt-3">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Website URL (for manual editing)</span>
          <input value={v.siteUrl} onChange={(e) => setV({ ...v, siteUrl: e.target.value })} placeholder="https://ir.show" className={inp} />
        </label>
        <button type="button" onClick={() => save.mutate()} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
          Save
        </button>
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="uppercase tracking-wider mb-2">Endpoints this panel calls</div>
          <div className="flex flex-wrap gap-1.5">
            {["/films", "/admin/films", "/me/tickets", "/contributions", "/pages"].map((e) => (
              <code key={e} className="rounded bg-muted px-2 py-1 text-[11px] font-mono">{e}</code>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Defaults" description="Applied to new films.">
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Default ticket price — USD (cents)</span>
          <input type="number" value={v.defaultPriceCents} onChange={(e) => setV({ ...v, defaultPriceCents: Number(e.target.value) })} className={inp} />
        </label>
        <label className="block mt-3">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Default ticket price — Toman</span>
          <input type="number" value={v.defaultPriceToman} onChange={(e) => setV({ ...v, defaultPriceToman: Number(e.target.value) })} className={inp} />
        </label>
        <label className="block mt-3">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Viewing window (hours)</span>
          <input type="number" value={v.defaultTicketHours} onChange={(e) => setV({ ...v, defaultTicketHours: Number(e.target.value) })} className={inp} />
        </label>
        <button type="button" onClick={() => save.mutate()} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
          Save defaults
        </button>
      </Panel>
    </div>
  );
}

function PaymentProvidersPanel() {
  const qc = useQueryClient();
  const [v, setV] = useState<PaymentProviderIds>(DEFAULT_PAYMENT_PROVIDER_IDS);
  useEffect(() => { loadCmsKey<PaymentProviderIds>(CMS_KEYS.PAYMENT_PROVIDER_IDS).then(setV); }, []);
  const save = useMutation({
    mutationFn: () => saveCmsKey(CMS_KEYS.PAYMENT_PROVIDER_IDS, v),
    onSuccess: () => { toast.success("Payment identifiers saved"); qc.invalidateQueries({ queryKey: ["site_content", CMS_KEYS.PAYMENT_PROVIDER_IDS] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Panel title="Payment providers">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 mb-5 text-xs text-amber-200/80">
        <Lock className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          For your security, <strong>secret keys are never stored here or in the website.</strong> They live only on your backend server.
          This panel just shows what's connected and holds public (non-secret) identifiers.
        </div>
      </div>

      <ProviderBlock
        name="Stripe"
        region="International · cards"
        connected={!!v.stripe.publishableKey}
        externalUrl="https://dashboard.stripe.com"
        externalLabel="Create a Stripe account"
        note="Secret key (sk_…) goes in the backend, never here."
      >
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Publishable key (public — safe to store)</span>
          <input value={v.stripe.publishableKey} onChange={(e) => setV({ ...v, stripe: { publishableKey: e.target.value } })} placeholder="pk_live_…" className={inp} />
        </label>
      </ProviderBlock>

      <ProviderBlock
        name="PayPal"
        region="International"
        connected={!!v.paypal.clientId}
        externalUrl="https://developer.paypal.com"
        externalLabel="PayPal developer"
        note="Client secret goes in the backend. PayPal does not operate inside Iran."
      >
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Client ID (public — safe to store)</span>
          <input value={v.paypal.clientId} onChange={(e) => setV({ ...v, paypal: { clientId: e.target.value } })} placeholder="AY…" className={inp} />
        </label>
      </ProviderBlock>

      <ProviderBlock
        name="ZarinPal"
        region="داخل ایران · تومان"
        connected={!!v.zarinpal.merchantId}
        externalUrl="https://www.zarinpal.com"
        externalLabel="ZarinPal"
        note="Requires an Iranian registered business, bank account & legal setup. Consult a local accountant/lawyer."
      >
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Merchant ID (درگاه — public identifier)</span>
          <input dir="ltr" value={v.zarinpal.merchantId} onChange={(e) => setV({ ...v, zarinpal: { merchantId: e.target.value } })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inp} />
        </label>
      </ProviderBlock>

      <button type="button" onClick={() => save.mutate()} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
        Save payment identifiers
      </button>
    </Panel>
  );
}

function ProviderBlock({
  name, region, connected, externalUrl, externalLabel, note, children,
}: {
  name: string; region: string; connected: boolean; externalUrl: string; externalLabel: string; note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium">{name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{region}</span>
        </div>
        <span className={`text-xs rounded-full px-2 py-0.5 ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
          {connected ? "Identifier saved" : "Not connected"}
        </span>
      </div>
      {children}
      <p className="mt-2 text-xs text-muted-foreground">
        {note}{" "}
        <a href={externalUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          {externalLabel} <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
