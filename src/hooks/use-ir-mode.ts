import { useLocale } from "@/lib/i18n";

/**
 * True when the visitor is in the Iran region (mirror, IR IP, or manually
 * chosen). When true, Stripe/PayPal flows are hidden and replaced with the
 * Iranian gateway (Toman pricing, IR bank cards).
 *
 * Derived from the locale context so there is a single source of truth that
 * is SSR-correct from the first byte — no hostname sniffing, no flash.
 */
export function useIrMode(): boolean {
  return useLocale().region === "iran";
}
