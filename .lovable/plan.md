Rebuild the featured film hero in `src/components/featured-film.tsx` around the selected "Cinematic Depth Console" direction, keeping all existing data, routing, i18n, RTL, accessibility, and mobile behavior intact.

## Desktop layout (md+)

- 21:9 letterbox frame with softer radius (`rounded-[2rem]`), thin `border-cream/10`, deep drop shadow.
- Background image stack unchanged (picture/source/img with existing srcSet, cover_fit, cover_position, Link wrapper).
- Layered gradients for hierarchy: bottom-up dark, left-side dark, and a subtle amber radial glow anchored bottom-right. Two soft blurred amber orbs (top-left small, bottom-right larger) sit behind the frame edges for depth.
- Top-right badge stack (RTL-aware):
  - Row 1: small amber pulsing dot + "Original / اختصاصی" in amber, all-caps, tracked.
  - Row 2: glass pill "Featured Film / ویژه تماشا".
- Bottom overlay (no full-width bar): two-column flex, `items-end`, `justify-between`.
  - Right column (RTL start): large title (`text-4xl md:text-6xl` — scaled down from prototype to fit long Persian titles safely), constrained `max-w-xl`, plus a short meta line under it (year · category · runtime) using existing film fields. `line-clamp-2` on title with `min-w-0` guarantees it cannot push into the console.
  - Left column: single "glass console" pill containing, in order (LTR visual): slider dot indicators, prev/next arrows, divider, amber "تماشا / Watch Now" CTA with an inset dark play chip. This replaces both the floating controls pill and the bottom bar CTA.
- Slider dots: active dot is a wider amber capsule with amber glow, inactive dots are 1.5px white/20 circles — visually calmer than current equal-size dots.
- Subtle group-hover: slight image scale (1.03) and title lift (-translate-y-1) for cinematic feel; respects `prefers-reduced-motion` via existing transition classes only.

## Mobile layout (< md)

Unchanged behavior, minor polish only:
- Keep 2:3 portrait frame and centered bottom `تماشا` glass pill.
- Match new frame radius (`rounded-[1.25rem]`).
- Slider controls stay in the existing stacked block below the frame.
- No large title overlay on mobile (matches current decision).

## Token discipline

Map prototype hex values to existing semantic tokens:
- `#050505` → `bg-0`
- `#c9a84c` → `amber`
- `#fcfaf2` / `#f5f5f0` → `cream-bright` / `cream`
- Glass surfaces → `bg-cream/5`, `border-cream/10`, `backdrop-blur-2xl`
- No new colors added to `src/styles.css`.
- No Google Fonts `<link>` from the prototype — keep IranSansX / project display font already loaded in `__root.tsx`.

## Accessibility & behavior preserved

- Whole image remains a `Link` to `/films/$slug` with dynamic Persian/English `aria-label`.
- CTA is a `Link` with `aria-label`, Space/Enter keyboard activation via existing `handleWatchKeyDown`, and `focus-visible` ring.
- Prev/Next/dot buttons keep current aria-labels and RTL rotation.
- Autoplay, pause on hover, and pointer-swipe handlers all retained.
- `fetchPriority`, `decoding`, `loading`, and picture `srcSet` for LCP unchanged.

## Files touched

- `src/components/featured-film.tsx` — refactor `SlideImageFrame` and `FeaturedFilmFallback`; `SliderControls` gets a compact "console" variant (smaller dots, capsule active state) but keeps the same props.
- No changes to `src/lib/home.functions.ts`, `src/routes/index.tsx`, `src/styles.css`, or data layer.

## Verification

- Build + typecheck.
- Playwright: desktop screenshot at 1440×900 (English + Persian) confirming badges, title, and console positions; a slide with a long Persian title to confirm no overlap; mobile 390×844 screenshot confirming pill placement.
- Keyboard test: Tab reaches image link → prev → dots → next → Watch; Space on Watch navigates.

````text
Desktop after change:

┌──────────────────────────────────────────────────────────────┐
│                                              ● ORIGINAL      │
│                                              [ ویژه تماشا ]  │
│                                                              │
│                                                              │
│                    cover image (21:9)                        │
│                                                              │
│                                            حمام فین          │
│                                            روایتی ناگفته…    │
│  ┌────────────────────────────────┐                          │
│  │ ‹ · ●── · · ›  │  [▶ تماشا]    │                          │
│  └────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
````
