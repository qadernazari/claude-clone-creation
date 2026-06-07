## Design polish plan — Apple TV+ / Netflix grade

Motion register: **5/5 (cinematic)**. All work stays inside the existing Noir & Gold tokens (`--bg-0`, `--amber`, Space Grotesk / DM Sans / Vazirmatn). No new colors, no new fonts. Tokens already in `src/styles.css` are reused via Tailwind utilities — no hardcoded hex in components.

### 1. Home — cinematic hero
`src/components/featured-film.tsx` + `src/routes/index.tsx`
- Full-bleed backdrop with double gradient (left-to-right scrim + bottom fade into rails) so title type sits on pure black.
- Auto-rotating featured slot (3 items, 7s each, pause on hover, swipeable on mobile). Indicator dots bottom-right.
- Muted trailer autoplay after 2.5s dwell on desktop (poster stays on mobile / reduced-motion).
- Title in Fraunces editorial italic for English, Vazirmatn 700 for Persian. Metadata strip: year • runtime • rating • genres, divided by hairline dots.
- Logline truncated to 2 lines with soft mask fade.
- Primary CTA "Watch" (cream fill) + secondary "More info" (hairline) + watchlist icon-button — all with subtle scale + glow on hover.
- Parallax: backdrop translates 8% slower than scroll, foreground content fades out by 60vh.

### 2. Home rails
`src/components/films-row.tsx`
- Section header: small amber eyebrow + large display title + "See all →" affordance.
- Edge fade masks (left/right) so posters dissolve into background instead of hard-clipping.
- Snap mandatory on desktop, momentum on mobile. Keyboard arrow nav for desktop carousels.
- Continue-watching rail shows progress bar + remaining-time chip overlay.

### 3. Film detail page
`src/routes/films.$slug.tsx`
- Editorial hero: large backdrop with Ken Burns drift, gradient to black, poster card floating on the left (desktop) / above (mobile).
- Sticky condensed header (title + Watch CTA) once the user scrolls past the hero.
- Metadata strip + tag chips (genre, language, country) under title.
- Synopsis in editorial serif drop-cap on first letter (English) — Vazirmatn equivalent treatment for Persian.
- Trailer launches a true cinema modal: black backdrop, blur, ESC to close, controls auto-hide.
- Cast & crew row with circular portraits, horizontal snap.
- "More like this" rail at bottom reusing the polished films-row.

### 4. Series / episode list
`src/components/series-episodes.tsx`
- Season picker as a segmented pill control (amber active state) instead of a dropdown when ≤4 seasons.
- Episode rows: 16:9 thumbnail (with progress bar overlay if started), episode number in display font, title, runtime, synopsis (2-line clamp).
- Hover on desktop: thumbnail scales 1.03, plays a 6s muted preview if `preview_url` exists, otherwise crossfades to a brighter still.
- "Next up" episode gets an amber hairline border + small "Continue" chip.
- Mobile: thumbnails stack with tap-to-expand synopsis.

### 5. Empty / loading / error states
Reusable in `src/components/states/`:
- `BrandSkeleton` — noir shimmer (already partly in `hero-mobile-skeleton`), generalize for posters, rails, detail pages.
- `EmptyWatchlist`, `EmptyLibrary`, `EmptySearch` — single line of editorial copy + amber line-art glyph + a CTA back to Browse.
- `ErrorBoundary` visual — IRAN wordmark glitching once, "Something interrupted the projection." copy, retry CTA.
- 404 page (`src/routes/__root.tsx` notFoundComponent) — single big "404" in Fraunces with amber underline, "This reel doesn't exist" line, link home. Already wired technically; this is the visual treatment.

### 6. Mobile polish
- **Tab bar** (`src/components/mobile-tab-bar.tsx`): refine icon weight (1.6 stroke), active state = small amber dot above icon + label fades from 60% → 100% cream, safe-area inset respected, hairline top border at 8% opacity. Press state scales icon 0.92.
- **Poster cards & rails**: tighter 2:3 aspect for posters, 16:9 for episodes/featured; larger tap targets (min 44px); momentum scroll with `scroll-snap-type: x mandatory` on featured rails only (free scroll elsewhere); remove desktop-only hover transforms via `(hover: hover)` guard (some already present, audit and complete).
- **Watch player UI** (`src/routes/_authenticated/watch.$slug.tsx`): custom controls overlay — center play/pause, bottom scrubber with amber fill and time chips, top-left back arrow + title, top-right subtitle/quality menus. Auto-hide after 3s idle, reveal on tap. Double-tap left/right = ±10s with ripple. Pinch-to-fullscreen on iOS. Subtitle styling: cream on translucent black pill, Vazirmatn for Persian tracks.

### 7. Persian (RTL) review
Audit and fix per screen:
- Home, Browse, Film detail, Watch, Account, Auth, Checkout, Admin shell.
- Mirror directional icons (chevrons, back arrows, "see all →" becomes "← همه").
- Re-check spacing: numbers stay LTR inside RTL strings via `<bdi>`, prices and runtimes audited.
- Vazirmatn line-height 1.75 already set; verify it doesn't break tight UI (tab labels, chips) — add per-component overrides where needed.
- Ensure horizontal rails reverse scroll direction in RTL (snap to right edge first).
- Test full app at `dir="rtl"` and capture before/after.

### Order of work
1. Tokens & shared primitives (states, skeletons, edge-fade mask utility).
2. Hero + rails (biggest visible win).
3. Film detail + episodes.
4. Watch player.
5. Tab bar + mobile audit.
6. RTL pass over everything above.

### Out of scope
- No new features, no new routes, no schema changes.
- Iranian payment gateway untouched (waiting on your provider).
- Multi-profile still deferred.

After you approve, I'll switch to build mode and ship 1 → 6 in that order, pausing after each major step so you can review on the live preview.
