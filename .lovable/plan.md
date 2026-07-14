## Fix: Remove black dead-space above the mobile hero — full-bleed image behind a transparent header

### Problem
On mobile, the hero section has `mt-24` (96px) on `HeroShell`, which pushes the image below the transparent site header. Because the header is transparent on the homepage, that gap renders as a solid black bar — the "dead space" seen in the screenshot.

### Change

**File: `src/components/featured-film.tsx`**

1. `HeroShell` wrapper — remove the mobile top margin so the image starts at the very top of the viewport and flows behind the transparent header. Keep the desktop offset intact.
   - Before: `mt-24 ... md:mt-32 ... pb-10`
   - After: `mt-0 pt-0 md:mt-32 pb-10`

2. `SlideImageFrame` mobile image column — add a subtle top gradient overlay to keep the header logo/icons legible against bright hero photos. Desktop unchanged.
   - Add a mobile-only `<div>` with `linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.15) 25%, transparent 55%)` inside the image column.
   - Adds ~130px of soft fade at the very top, so light-sky photos (as in the screenshot) don't wash out the header.

### Result
- No black rectangle above the hero — the sky/photo now extends up to the top edge.
- Header icons remain readable via the soft top scrim.
- Desktop layout unchanged (framed card with rounded corners stays as-is).
- Non-hero pages still get the normal solid header (already handled by `hasHero` logic in `site-header.tsx`).

### Notes
- No changes to `site-header.tsx` — transparency-on-hero behavior is already correct.
- No content, routing, or logic changes.