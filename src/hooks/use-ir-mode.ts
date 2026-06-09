import { useEffect, useState } from "react";

// The hostname served by the Hetzner reverse proxy for Iran visitors.
// Keep in sync with docs/iran-mirror.md and src/components/iran-mirror-banner.tsx.
const MIRROR_HOST = "m.ir.show";

/**
 * Returns true when the current page is being served from the Iran mirror.
 * In IR mode, Stripe/PayPal checkout is hidden and replaced with the
 * Iranian gateway flow (Toman pricing, IR bank cards).
 *
 * SSR-safe: returns false during server render, then settles on the real
 * value after hydration.
 */
export function useIrMode(): boolean {
  const [ir, setIr] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIr(window.location.hostname === MIRROR_HOST);
  }, []);
  return ir;
}
