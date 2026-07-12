## Extend Featured Film hero to fit all content

The desktop info panel currently uses fixed heights (`md:h-[420px] lg:h-[480px] xl:h-[520px]`) plus tight grid rows and `line-clamp-2` / `line-clamp-3`, which clips long titles and synopses. I'll extend the frame and let content fully display.

### Changes in `src/components/featured-film.tsx`

1. **Grow the frame height** so the info column has room:
   - `md:h-[480px] lg:h-[560px] xl:h-[620px]` (up from 420/480/520).

2. **Remove clamping on title and synopsis** in the desktop info panel:
   - Drop `line-clamp-2` on the `<h2>` title.
   - Drop `line-clamp-3` on the synopsis `<p>`.
   - Remove `overflow-hidden` on those two blocks.

3. **Replace fixed grid rows with a flexible flow** in the info column:
   - Change `grid grid-rows-[1.25rem_6.25rem_5.25rem_1.75rem_3rem]` (and lg variant) to a simple `flex flex-col gap-4 lg:gap-5`.
   - Each block (eyebrow, title, synopsis, meta, buttons) becomes an auto-height flex item — nothing gets cropped regardless of length.

4. **Keep image column aspect intact**: the image side already stretches to `md:h-full`, so the taller frame just gives it more vertical room while remaining 16:9-ish within the split. No change to `<picture>` markup.

5. **Fallback shell**: bump `FeaturedFilmFallback` container to match the new heights so skeleton doesn't jump.

### Verification

- Load `/` on desktop: full title (e.g. "Grand Bazaar of Isfahan"), full synopsis (all sentences), meta row, and both buttons all visible without truncation.
- Switch slides: no layout shift; each slide's content fits in the taller panel.
- Mobile layout unchanged (no fixed heights there).
- Build + typecheck pass.
