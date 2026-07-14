import type { Locale } from "./i18n";

export type WatchCtaState = {
  /** Whether an authenticated user session exists. */
  isAuthenticated: boolean;
  /** Whether the user currently has an active membership or trial. */
  isMember: boolean;
  /**
   * Whether the user *had* a trial or subscription that is now finished
   * (trial expired, subscription canceled/ended). Used to prompt renewal.
   */
  isMembershipEnded: boolean;
};

/**
 * Returns the primary "watch" CTA label based on the viewer's auth and
 * membership state.
 *
 *   - Signed out                → "ورود و پخش" / "Sign in & Watch"
 *   - Signed in + active member → "پخش" / "Watch"
 *   - Signed in, membership ended or never subscribed → "خرید اشتراک و پخش" / "Subscribe & Watch"
 */
export function watchCtaLabel(locale: Locale, state: WatchCtaState): string {
  const fa = locale === "fa";
  if (!state.isAuthenticated) return fa ? "ورود و پخش" : "Sign in & Watch";
  if (state.isMember) return fa ? "پخش" : "Watch";
  return fa ? "خرید اشتراک و پخش" : "Subscribe & Watch";
}

/** Short/compact variant for tight buttons (mobile pill etc.). */
export function watchCtaShort(locale: Locale, state: WatchCtaState): string {
  const fa = locale === "fa";
  if (!state.isAuthenticated) return fa ? "ورود و پخش" : "Sign in";
  if (state.isMember) return fa ? "پخش" : "Watch";
  return fa ? "اشتراک" : "Subscribe";
}
