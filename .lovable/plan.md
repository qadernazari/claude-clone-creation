## Featured Film hero — cleanup & Persian polish

Scope: `src/components/featured-film.tsx` only. Presentation-only changes.

### 1. Remove the "Featured Film / ویژه تماشا" badge
- Delete the pill under the top-right stack (the second badge). Keep only the small amber dot + `اختصاصی / Original` label.

### 2. Match frame to the uploaded cover's own aspect
Right now the desktop frame is forced to `aspect-[21/9]`, which crops any cover that isn't 21:9 (this is what makes Persian titles look "cropped/cutted" against the bottom bar too).
- Desktop: switch from fixed `aspect-[21/9]` to `aspect-video` (16:9) as default, which matches the 16:9 covers admin now enforces. Mobile stays `aspect-[2/3]` for the portrait cover.
- When `cover_fit === "contain"`, let the image show fully (no crop) on top of the gradient background.

### 3. Fix Persian text being cropped in the bottom overlay
Causes: `line-clamp-2` + very large font (`text-5xl xl:text-6xl`) + tight `max-w-xl` + `leading-[1.1]` cut descenders of Persian glyphs (ی/ج/ح), and the title column collides with the console on medium widths.
- Reduce title size to `text-2xl lg:text-3xl xl:text-4xl`.
- Increase `leading` to `leading-[1.4]` for Persian (via `[lang="fa"]` selector already global) and add `pb-1` so descenders aren't clipped by `overflow-hidden` on the frame.
- Widen title column: use a 2-col grid (`grid-cols-[auto_minmax(0,1fr)]`) so console gets `auto` and title gets the remaining space, guaranteeing no overlap at any width.
- Keep `line-clamp-2` but add `break-words` to avoid long Persian words spilling.
- Bump the top-right badge stack down slightly and reduce the `اختصاصی` label tracking (Persian doesn't need `0.22em` letter-spacing — it looks broken).

### 4. Minor polish
- Remove the now-single-badge wrapper's extra `flex-col gap-2.5` (no longer needed with one item).
- Ensure the mobile "تماشا" pill uses the same amber background style as desktop for visual consistency (currently glass on mobile, solid amber on desktop) — keep glass on mobile per prior user choice, no change here unless requested.

### Files
- `src/components/featured-film.tsx` — edits to `SlideImageFrame` (badges block, frame aspect, bottom overlay title block) and `FeaturedFilmFallback` (aspect to match).

No backend, no other components touched.