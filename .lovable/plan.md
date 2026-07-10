
## Goal

Make the film detail hero feel cinematic and readable on both desktop and mobile. The photo stays full-bleed, but the text column gets anchored in solid darkness so the title never fights the busy image behind it — matching the selected "Cinematic vertical focus" direction.

## What changes (only the hero band in `src/routes/films.$slug.tsx`)

1. **Stronger bottom-up gradient stack.** Replace the current soft bottom fade with a two-layer stack: a vertical gradient that goes from transparent at the top to ~88% dark at 82% height and fully solid at the bottom, plus a heavier side fade on the anchored edge. This gives the title/synopsis/CTAs a clean dark plate to sit on instead of floating over the tile pattern.

2. **New category chip.** Drop the pill with blurred background. Replace with a thin 2px amber vertical bar + small uppercase tracked label (10px, `tracking-[0.28em]`). Cleaner, more editorial, matches the amber accents already used on rails.

3. **Title weight + shadow bump.** Move from `font-medium` to `font-black` and increase drop shadow (`drop-shadow-[0_6px_28px_rgba(0,0,0,0.75)]`) so the Persian title reads crisply against any cover.

4. Nothing else moves — meta row, synopsis, CTAs, watchlist, share, preview button, and the 90-days-free note all stay exactly where they are. No changes to the image itself, no changes to the info grid below.

## Notes

- Palette, fonts, and layout structure stay locked (amber `#d4a24c`, cream on near-black, IranSansX for Persian, Space Grotesk for Latin).
- Applies to both mobile and desktop — the same gradient stack helps most on mobile where the image previously ran edge-to-edge under the text.
- No new dependencies, no schema changes.
