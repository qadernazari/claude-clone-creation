## What's still left from the design polish

I shipped the quick wins last turn (hero CTAs, rails edge-fade, episode list, tab bar dot, 404). The remaining items from the approved plan are the heavier, structural ones — these are what still separate IRAN from a Netflix/Apple TV+ feel.

### 1. Film detail page — full editorial rebuild
`src/routes/films.$slug.tsx`
- Large backdrop hero with slow Ken Burns drift, gradient down to bg-0.
- Floating poster card on the left (desktop) / above title (mobile).
- Sticky condensed header: title + Watch CTA appears after the hero scrolls out.
- Metadata strip (year · runtime · rating) + genre/language/country chip row.
- Synopsis in editorial serif with drop-cap (English) / Vazirmatn weight treatment (Persian).
- True cinema trailer modal — black backdrop, blur, ESC to close, controls auto-hide.
- Cast & crew row with circular portraits + horizontal snap.
- "More like this" rail at bottom reusing the polished films-row.

### 2. Watch player — custom controls
`src/routes/_authenticated/watch.$slug.tsx`
- Custom overlay replacing default `<video controls>`:
  - Center play/pause with ripple
  - Bottom scrubber with amber fill, time chips, buffered range
  - Top-left back arrow + film title; top-right subtitle/quality/speed menus
- Auto-hide after 3s idle, reveal on any pointer/tap
- Double-tap left/right = ±10s with a circular ripple HUD
- Pinch-to-fullscreen on iOS, native fullscreen button elsewhere
- Subtitle styling: cream on translucent black pill, Vazirmatn for Persian tracks
- Continue-watching position saved every 5s (already partially wired — verify)

### 3. Continue-watching rail polish
`src/components/continue-watching.tsx`
- Progress bar overlay on poster bottom (amber fill)
- Remaining-time chip ("23 min left" / "۲۳ دقیقه")
- Hover reveals a "Resume" pill

### 4. Empty / loading / error pass
Wire the new `<EmptyState />` primitive into:
- `src/routes/_authenticated/library.tsx` (no watchlist / no purchases)
- `src/routes/browse.tsx` (no search results)
- `src/routes/_authenticated/my-tickets.tsx` (no tickets)
- Cinematic error boundary visual in `__root.tsx` ErrorComponent (matches new 404)

### 5. Mobile audit
- Poster cards: confirm 2:3 ratio, 44px+ tap targets, free scroll on rails, snap on featured only.
- Browse page filter chips: refine active state, scroll snap.
- Account sheet: tighten spacing, verify safe-area on iOS notch.

### 6. Persian (RTL) audit
Walk every screen at `dir="rtl"` and fix:
- Mirrored chevrons / back arrows / "see all →" → "← همه"
- Numbers stay LTR inside RTL strings via `<bdi>` (prices, runtimes)
- Horizontal rails snap to right edge first
- Vazirmatn line-height overrides for tight UI (tab labels, chips)
- Capture before/after screenshots per screen

### Suggested order
1 → 2 → 3 → 4 → 5 → 6. I'd pause after each so you can review live.

### Still parked (your call, not in this plan)
- Iranian payment gateway (waiting on provider)
- Multi-profile accounts (large data refactor)
- Auto-rotating featured hero (needs DB column for multiple featured films)
- Trailer autoplay preview on hover (needs trailer asset field on `films`)

Approve and I'll start with #1 (film detail editorial rebuild) — biggest visible jump after the hero.
