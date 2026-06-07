# Stabilize first paint + smoother mobile scroll

Two independent passes. Phase 1 removes all visible movement of the bottom tab bar and surrounding content on initial render. Phase 2 reduces stutter while scrolling lists of posters.

## Phase 1 — No layout shift on first paint

### Root causes seen in the code
1. **`data-no-tabbar` is set in a `useEffect`.** On routes that hide the bar (`/watch`, `/auth`, `/checkout`, `/admin`), the body still renders with `padding-bottom: calc(56px + safe-area)` for the first frame, then snaps to `0` once the effect runs. Visible jump on those routes.
2. **`--tabbar-vv-offset` defaults to `0px` but is recomputed in a `useEffect` on iOS visualViewport changes.** First paint can place the bar, then the iOS URL bar collapses and the bar shifts up. Also, the listener triggers re-paints on every scroll.
3. **The Library tab is conditional on `user`** (`{user && <TabItem … />}`). Auth state resolves async, so the tab bar reflows from 3 → 4 tabs after first paint, visibly shifting every other tab horizontally.
4. **Tab bar relies on `md:hidden` only.** That part is fine (pure CSS), but the bar is appended at the end of `<Outlet />` in `__root`, so on hidden routes it renders for a frame before the effect hides body padding.
5. **Hero `min-h-[520px]` on mobile but no explicit height reservation for sections below**, so when posters load they push content. Combined with the tab-bar padding flip this is the visible "everything jumps" effect.

### Fixes

**A. Make tab-bar space reservation CSS-only, no JS toggle.**
- Replace the JS `data-no-tabbar` toggle with a route-driven CSS approach: set `data-tabbar="hidden"` on `<html>` from the same inline boot script in `__root` based on the pathname (`/watch/`, `/auth`, `/reset-password`, `/checkout`, `/admin`). Update CSS selector from `body[data-no-tabbar="true"]` to `html[data-tabbar="hidden"] body`.
- Keep the React effect as a safety net for client-side navigation, but the inline script handles first paint so SSR HTML already has the right state.

**B. Always render 4 tabs; gate destination, not presence.**
- Always render the Library tab. When `user` is null, link it to `/auth` (same pattern as Account). This keeps the bar geometry identical from first paint regardless of auth resolution. Optionally render it disabled-looking but the simplest fix is the auth redirect.

**C. Stop the visualViewport-driven bottom offset from causing reflow.**
- Initialize `--tabbar-vv-offset` to `0px` at the `:root` level in `styles.css` so the CSS variable exists before JS runs (it already defaults, but make it explicit so SSR HTML reflects the intended layout).
- Throttle the `visualViewport` `scroll`/`resize` handler with `requestAnimationFrame` and skip writes when the value is unchanged. This removes per-frame style writes during scroll (also helps Phase 2).
- Consider dropping the visualViewport listener entirely and relying on `bottom: 0` + `env(safe-area-inset-bottom)`. The iOS URL-bar offset compensation is rarely worth the reflow cost; verify on the attached video repro before/after.

**D. Reserve hero + first row height to prevent CLS as images decode.**
- Hero already uses `h-[82svh] min-h-[520px]` — keep, but ensure the `<img>` inside `FeaturedFilm` declares `width`/`height` and `fetchpriority="high"` (the route already preloads it). Verify and add if missing.
- Films-row posters: add explicit `width` and `height` (or `aspect-ratio`) on the `<img>` so the row's height is fixed before pixels arrive.

**E. Verify.**
- Use `browser--view_preview` at 390×844 and record before/after with `browser--screenshot`. Watch for any movement of the tab bar between the loading shell and post-load state on `/`, `/browse`, `/watch/:slug`, `/auth`.

---

## Phase 2 — Premium scroll feel

### Image pipeline
- **Thumbnail size:** `browse.server.ts` already requests `width=600, quality=68`. On mobile that's 2× the rendered size (~180–220 px). Add a second variant at `width=320, quality=70` and serve it via `<img srcset>` so phones download ~1/3 the bytes per poster.
- **Format:** keep Supabase's WebP output; nothing else to do server-side.
- **Decode:** add `decoding="async"` and `loading="lazy"` to every off-screen poster (`films-row`, `collections-grid`, `continue-watching`). The first row of the first visible carousel should be `loading="eager"` + `fetchpriority="high"` to keep LCP.
- **Preload first row thumbnails:** in the home route `head().links`, after the featured image, add `rel="preload" as="image"` for the first 2–3 posters of the first carousel (using loader data). Limits to avoid bandwidth contention.

### Render cost while scrolling
- Wrap `FilmCard` / row item components in `React.memo` keyed on `id` + `thumbnail_url` so parent re-renders don't recompute every card.
- Apply `content-visibility: auto; contain-intrinsic-size: <row-height>;` on each `FilmsRow` and on long below-the-fold sections (`CollectionsGrid`, `FaqSection`). This skips rasterization for offscreen content and is the single biggest mobile-scroll win.
- Add `will-change: transform` only on the horizontally-scrolling carousel track (not on cards). Avoid `backdrop-blur` on scrolling surfaces; the tab bar's `backdrop-blur-xl` is fine because it's fixed, but check that no row uses it.
- Replace any heavy per-scroll `useEffect` (e.g., the visualViewport listener from Phase 1) with rAF-throttled handlers.

### Verify
- `browser--performance_profile` on `/` mobile viewport, compare INP and long-task count before/after.
- Manual scroll on preview at 390×844; look for 60 fps in DevTools performance panel.

---

## Files to change

- `src/components/mobile-tab-bar.tsx` — always render 4 tabs, rAF-throttle vv listener (or remove), drop the body data-attribute toggle.
- `src/routes/__root.tsx` — extend the inline boot script to set `html[data-tabbar="hidden"]` from `location.pathname`.
- `src/styles.css` — switch selector to `html[data-tabbar="hidden"] body`, declare `--tabbar-vv-offset: 0px` at `:root`, add `content-visibility` utility for rows.
- `src/components/films-row.tsx`, `src/components/featured-film.tsx`, `src/components/collections-grid.tsx`, `src/components/continue-watching.tsx` — add `width`/`height`/`srcset`/`decoding`/`loading`/`fetchpriority`, memoize cards, add `content-visibility` wrapper.
- `src/lib/browse.server.ts` and `src/lib/home.functions.ts` — emit a small (`w=320`) thumbnail variant alongside the existing 600 px one.
- `src/routes/index.tsx` — preload first-row thumbnails in `head().links`.

## Out of scope
- No copy or i18n changes.
- No business logic / data model changes.
- No new dependencies.
