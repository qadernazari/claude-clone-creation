## Redesign: Framed Cinematic Hero Slider

Refactor `src/components/featured-film.tsx` from a full-bleed background hero into a **two-column framed gallery** layout. The film image sits inside a rounded, bordered frame in a **2:3 portrait ratio**, with text + CTAs + slider controls on the other column.

### Layout
```
┌─────────────────────────────────────────────┐
│  ┌──────────────┐   ┌─────────────────┐     │
│  │  ORIGINAL    │   │                 │     │
│  │  Sci-Fi/Doc  │   │                 │     │
│  │              │   │   FRAMED 2:3    │     │
│  │  TITLE       │   │   POSTER/COVER  │     │
│  │  (large)     │   │                 │     │
│  │              │   │   (portrait)    │     │
│  │  Meta·Year   │   │                 │     │
│  │  Synopsis    │   │                 │     │
│  │              │   │                 │     │
│  │  [Watch] [Info] │                 │     │
│  │              │   └─────────────────┘     │
│  │  ‹ ›  ▬ · · · ·                          │
│  └──────────────┘                           │
└─────────────────────────────────────────────┘
```

- Desktop: `grid lg:grid-cols-2` with `gap-12 lg:gap-20`, content left, frame right.
- Mobile: stack — frame first, content below (`order-1` / `order-2` swap).
- Container: `max-w-7xl mx-auto px-6 md:px-12 py-14 md:py-20`, uses `bg-bg-0` (no more full-bleed image background).
- RTL: grid order swaps automatically via `dir="rtl"` on `<html>`; keep `order-1/order-2` classes so both LTR and RTL read image-right on desktop (or flip via a `[dir=rtl]:lg:order-*` if needed — mirror the reference).

### Framed image
- Outer frame: `p-3 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-sm shadow-2xl`.
- Inner: `aspect-[2/3] rounded-[1.4rem] overflow-hidden relative`.
- Prefer portrait source: `film.cover_url` (existing 2:3 poster) over `thumbnail_url` (16:9). Fall back to `thumbnail_url` if no cover.
- Ambient amber glow behind frame: `absolute -inset-10 bg-amber/10 blur-[100px] rounded-full opacity-60`.
- Corner accent brackets on top-right and bottom-left (amber/30, ~24×24 with border-t/r or border-b/l).
- Inner gradient overlay for text-legibility of any on-image badges only.
- Cross-fade between slides retained (opacity transition, active z-10).

### Text column
- Amber "ORIGINAL" chip + separator + category label (already localized).
- Title: `text-5xl md:text-6xl lg:text-7xl font-bold` (700, no synth-bold), display font.
- Meta row: director (hidden for `walking-tour`) · year · duration in Persian numerals when `locale === 'fa'`.
- Synopsis: 2-line clamp, `text-lg text-cream/70`.

### CTAs — rectangular
Per user direction, buttons become **rectangular** (not pills):
- Watch Now: `rounded-md bg-amber text-ink px-8 py-4 font-bold shadow-xl shadow-amber/20` with play icon.
- More Info: `rounded-md border border-cream/15 bg-cream/5 hover:bg-cream/10 px-8 py-4 font-semibold`.
- Add-to-Watchlist stays as ghost rectangular button, gated by `useDeferredMount` + `useCurrentUser` as today.

### Slider controls
- Round prev/next buttons (`w-12 h-12 rounded-full border border-cream/10`) placed below the text — always visible (not hover-only). Arrows mirror in RTL via `rtl:rotate-180`.
- Dots become a progress-bar strip: active `w-10 h-1 bg-amber rounded-full`, inactive `w-4 h-1 bg-cream/20`.
- Autoplay 6.5s, pause on hover/pointer-down, swipe support — all preserved.

### Cleanup
- Remove full-bleed hero height (`h-[58svh]`/`h-[68dvh]`) — replaced by content-driven layout.
- Remove background image gradients / horizontal dark plate since image is now contained.
- Keep `SingleSlide`, `FeaturedFilmFallback` visually consistent with the new frame.
- `mt-16 md:mt-20` retained so hero clears the header.
- `cover_fit` / `cover_position` still respected inside the frame (`object-cover` + position class, or `object-contain` if set).

### Files touched
- `src/components/featured-film.tsx` — full rewrite of `FeaturedSlider`, `Slide`, `SingleSlide`, `FeaturedFilmFallback`, `WatchlistCta`.
- No changes to `src/lib/home.functions.ts`, data layer, or other components.
- No CSS token changes.

### Not in scope
- Film detail page hero (`/films/$slug`) — untouched unless requested next.
- Rails (`films-row.tsx`) — untouched.
- Nav, footer — untouched.
