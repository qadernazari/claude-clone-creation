Redesign the homepage featured-film hero in `src/components/featured-film.tsx`.

Goals
- Place the text column (badges, title, metadata, synopsis, buttons) on the left side of the film cover.
- Place the framed film cover/poster on the right side.
- Keep the two-line metadata (director · year · duration) directly beneath the title.
- Keep the layout fixed LTR (text left / cover right) regardless of Persian/English locale.
- Preserve the existing mobile behavior: stacked cover-above-text.
- Keep slider controls visible and usable; keep them overlaid at the bottom of the film frame.

Implementation
1. Refactor the `FeaturedSlider` shell from a vertical stack into a responsive two-column grid:
   - Mobile: single column, cover first, text second.
   - Tablet/desktop: `grid-cols-2`, text column left, cover column right.
2. Move `SlideImageFrame` into the right grid column and `SlideDetails` into the left grid column.
3. Inside `SlideDetails`, reorder so the metadata line sits immediately below the `<h2>` title.
4. Constrain the cover frame width on desktop so it does not dominate; keep the amber corner accents and bottom scrim with slider controls.
5. Use Tailwind logical utilities or explicit `order-*`/`text-left` classes to force LTR visual order in both locales.
6. Verify the single-slide fallback (`Slide`) and `FeaturedFilmFallback` follow the same two-column pattern.

Out of scope
- No changes to data fetching, autoplay timing, or slider logic.
- No new dependencies.
- No changes to the film rail cards or other pages.

Verification
- TypeScript check passes.
- Mobile and desktop screenshots show text-left/cover-right layout with metadata under title.