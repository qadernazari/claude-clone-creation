## Goal
Cut mobile Total Blocking Time (1,070ms → <300ms) and JS execution (~3s → <1.5s) by removing JavaScript that the homepage doesn't actually need on first paint. No visual changes.

## Root causes identified

1. **Stripe SDK leaks into the homepage bundle (~150 KB+).**
   `src/lib/stripe.ts` imports `@stripe/stripe-js` at module top. `src/hooks/use-subscription.tsx` imports from `@/lib/stripe`, so every component using `useSubscription` / `useCurrentUser` (site-header, featured-film, continue-watching, mobile-tab-bar, trial-banner, accept-trial-button, watchlist-button) pulls Stripe into the initial chunk. Stripe is only needed on `/membership` and the film checkout sheet.

2. **PageOverlayProvider eagerly imports CMS + overlay content for the whole site** in `__root.tsx`, even on first paint of `/`.

3. **AuthMenu (535 lines) loads eagerly in the header** — it's only opened on click. Same for `MobileTabBar` and `IranMirrorBanner` rendered in root.

4. **Below-the-fold rails (`FilmsRow`, `ContinueWatching`) execute on first render** instead of after the hero. They run queries, image lists and watchlist logic synchronously during hydration.

5. **`AuthInvalidator` runs `supabase.auth.getSession()` + `captureMemberGeo()` at mount**, before the hero is interactive, contributing to long tasks.

6. **Duplicate auth subscriptions:** `__root.tsx` subscribes to `onAuthStateChange`, and every `useCurrentUserState()` mount subscribes again (header, featured-film, continue-watching, mobile-tab-bar). On mobile the homepage instantiates 4–5 of these — each triggers its own `getSession()` round-trip.

## Plan (code-only, no visual changes)

### 1. Split Stripe out of the initial bundle
- Move `getStripeEnvironment` to a tiny `src/lib/stripe-env.ts` that does NOT import `@stripe/stripe-js`. Re-export from `stripe.ts` for back-compat.
- Update `use-subscription.tsx`, `membership-panel.tsx` to import from `stripe-env.ts`.
- Keep `getStripe()` (which calls `loadStripe`) in `stripe.ts` — only `film-checkout.tsx` and `membership-checkout.tsx` import it, and both are already lazy-loaded.
- Expected saving: ~150 KB of unused JS on home/browse/about/contact/auth.

### 2. Centralise auth/session in a single context
- Create `src/lib/auth-context.tsx` exposing one `AuthProvider` that runs `getSession()` + `onAuthStateChange` ONCE.
- Rewrite `useCurrentUserState`, `useCurrentUser` to read from the context (no new subscription per consumer).
- Mount `AuthProvider` inside `RootComponent` in `__root.tsx` and remove the duplicated `supabase.auth.getSession()` from `AuthInvalidator` (keep only router/query invalidation).
- Expected: removes 4–5 redundant `getSession()` calls + listener subscriptions on home mount → less TBT, fewer long tasks.

### 3. Lazy-load below-the-fold homepage sections
- In `src/routes/index.tsx`, convert `FilmsRow` and `ContinueWatching` to `lazy()` + `Suspense` with a lightweight skeleton fallback identical to current spacing (no visual change).
- Wrap them in an `IntersectionObserver`-based mount gate (`MountWhenNear`, 600px rootMargin) so their chunk is fetched only when the user starts scrolling.
- Keep `FeaturedFilm` eager (it's the LCP).

### 4. Lazy-load non-critical root chrome
- In `__root.tsx`, convert `MobileTabBar` and `IranMirrorBanner` to `lazy()` rendered inside a `<ClientOnly>` after first paint (mount on `requestIdleCallback`, or after a `useHydrated()` + 0-ms timeout). They're not needed for FCP/LCP.
- Defer `PageOverlayProvider`'s CMS preload: keep the provider eager (it provides context), but lazy-import the overlay panel component only when an overlay is requested. Audit `page-overlay.tsx` to ensure nothing runs at mount that touches CMS.

### 5. Lazy-load AuthMenu
- In `site-header.tsx`, replace the eager `import { AuthMenu }` with `lazy()`; render a tiny placeholder (same dimensions as the trigger button) until idle, then hydrate. The 535-line panel + its icons stay out of the initial chunk.

### 6. Defer `captureMemberGeo`
- Wrap the call in `requestIdleCallback` (fallback `setTimeout(…, 2000)`) inside `AuthInvalidator` so the network + work happens after the page is interactive.

### 7. Tighten image work on first paint
- Confirm `films-row.tsx` and `continue-watching.tsx` images already use `loading="lazy"` + `fetchpriority="low"` (verified previously) — no change unless audit finds regression.

## Out of scope
- Visual / layout changes.
- Touching the Caddy mirror config (separate task — cache-lifetimes audit).
- Server-side membership / payments logic.

## Verification
After implementation, re-run mobile PageSpeed Insights against `https://www.ir.show` and confirm:
- TBT under ~300 ms
- JS execution under ~1.5 s
- "Reduce unused JavaScript" savings drops well below 290 KiB
- No regression in FCP / LCP / CLS
- Homepage still renders the same hero, rails, header, tab bar, and overlays