# Featured Hero Redesign — Filimo-style Split Layout

Rework `src/components/featured-film.tsx` desktop layout to match the reference: cover image dominates the left, and all text/controls live in a right-side info column inside the same frame. Mobile keeps the current stacked layout.

## Desktop layout (md+)

```text
┌────────────────────────────────────────────────────────────┐
│                                        │  [Logo/Title]     │
│                                        │                   │
│         COVER IMAGE (16:9-ish,         │  Description      │
│         fills left ~65-70%)            │  (2 lines)        │
│                                        │                   │
│                                        │  [+12] 1405 ♥78%  │
│                                        │                   │
│                                        │  ▶ ورود و پخش     │
│                                        │  پیش‌نمایش         │
│  ‹ ›                                   │                   │
└────────────────────────────────────────────────────────────┘
```

- Container: rounded-2xl, subtle border, soft outer shadow — no amber glow orbs, no glass console.
- RTL: image column on the right visually (since `dir="rtl"`), info column on the left — in the reference (Persian) image is on the left, info on the right; this matches natural RTL flow of a `flex` row with image first + info second.
- Image: `aspect-video` object-cover, no scale-on-hover, no letterbox bars.
- Info column: ~32–36% width, vertically centered content, right-aligned Persian text with breathing room.
- Badges row: age rating pill (amber), season/episode count, heart + rating percent — small, muted.
- Primary CTA: solid amber pill with play icon → `تماشا` (or `ورود و پخش`).
- Secondary CTA: ghost/outline pill → `پیش‌نمایش` linking to film details.
- Prev/next arrows: bottom-left corner of frame, small circular glass buttons; dots removed (or moved next to arrows as thin bar).

## What gets removed

- Bottom overlay bar with gradient
- Floating glass "console"
- Amber glow orbs / heavy shadows
- "Original / اختصاصی" corner badge (info now sits in the column; keep only if it fits inline as a small tag)

## Mobile (unchanged behavior)

- Keep current 16:9 frame with centered bottom "تماشا" pill.
- Slider arrows/dots below frame as-is.

## Files touched

- `src/components/featured-film.tsx` — layout rewrite (JSX + classes only; data plumbing untouched)
- No CSS token changes; reuse existing amber/primary tokens.

## Verification

- Build + typecheck
- Playwright screenshot at desktop (1280) and mobile (390) in Persian locale
- Confirm long titles do not collide with CTAs (info column has its own width)
- Confirm image is not cropped weirdly on wide viewports
