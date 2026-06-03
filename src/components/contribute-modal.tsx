import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createContributionCheckout } from "@/lib/contributions.functions";
import { useLocale } from "@/lib/i18n";

interface ContributeModalProps {
  filmSlug?: string;
  filmTitle?: string;
  returnUrl: string;
  onClose: () => void;
}

const PRESETS = [500, 1000, 2500, 5000]; // cents

export function ContributeModal({ filmSlug, filmTitle, returnUrl, onClose }: ContributeModalProps) {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";
  const [amountCents, setAmountCents] = useState<number | null>(1000);
  const [customDollars, setCustomDollars] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const t = {
    title: fa ? "از این فیلم حمایت کنید" : "Support this work",
    titleGeneric: fa ? "از IRAN حمایت کنید" : "Support IRAN",
    sub: fa
      ? "هر مبلغی به فیلمسازان مستقل کمک می‌کند."
      : "Any amount supports independent filmmakers.",
    presetsLabel: fa ? "مبلغ" : "Amount",
    custom: fa ? "مبلغ دلخواه (دلار)" : "Custom amount (USD)",
    contribute: fa ? "ادامه به پرداخت" : "Continue to payment",
    cancel: fa ? "انصراف" : "Cancel",
    min: fa ? "حداقل ۱ دلار" : "Minimum $1",
  };

  function selectPreset(v: number) {
    setAmountCents(v);
    setCustomDollars("");
  }

  function applyCustom(value: string) {
    setCustomDollars(value);
    const dollars = parseFloat(value);
    if (!isNaN(dollars) && dollars >= 1 && dollars <= 10000) {
      setAmountCents(Math.round(dollars * 100));
    } else {
      setAmountCents(null);
    }
  }

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!amountCents) throw new Error("Invalid amount");
    const result = await createContributionCheckout({
      data: {
        amountCents,
        ...(filmSlug && { filmSlug }),
        returnUrl,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [amountCents, filmSlug, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg-0/85 backdrop-blur px-4 py-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-bg-1 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-bg-0 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15"
        >
          ✕
        </button>

        {!confirmed ? (
          <>
            <h2 className={`text-2xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {filmTitle ? t.title : t.titleGeneric}
            </h2>
            {filmTitle && <p className="mt-1 text-sm text-cream/70">{filmTitle}</p>}
            <p className="mt-2 text-sm text-cream/60">{t.sub}</p>

            <fieldset className="mt-6">
              <legend className="text-xs uppercase tracking-widest text-cream/55 mb-2">
                {t.presetsLabel}
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((cents) => {
                  const selected = amountCents === cents && customDollars === "";
                  return (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => selectPreset(cents)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors tabular-nums ${
                        selected
                          ? "border-amber bg-amber/15 text-cream-bright"
                          : "border-cream/15 text-cream/80 hover:bg-cream/5"
                      }`}
                    >
                      ${(cents / 100).toFixed(0)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{t.custom}</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={10000}
                step="1"
                value={customDollars}
                onChange={(e) => applyCustom(e.target.value)}
                placeholder="25"
                className="mt-1 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream-bright outline-none focus:border-amber"
              />
              {customDollars && !amountCents && (
                <p className="mt-1 text-xs text-destructive">{t.min}</p>
              )}
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-cream/15 px-4 py-2 text-sm text-cream/80 hover:bg-cream/5"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!amountCents}
                onClick={() => setConfirmed(true)}
                className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.contribute}{amountCents ? ` · $${(amountCents / 100).toFixed(2)}` : ""}
              </button>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
