Make every film card in `films-row.tsx` 16:9 rectangular instead of the current 2:3 portrait.

1. Change `PosterCard` aspect ratio from `aspect-[2/3]` to `aspect-video` (16:9).
2. Widen card sizes so the shorter cards still feel substantial:
   - Mobile: `w-[56vw]` (up from 42vw)
   - sm: `w-[260px]`
   - md: `w-[300px]`
   - lg: `w-[340px]`
3. Update the `<img>` width/height attributes to 16:9 dimensions (e.g. 680×383) and the `sizes` attribute to match the new widths.
4. Keep the title, director, and year block below the image as it is now.
5. Verify the edge-fade mask and horizontal snap scrolling still work with the new card sizes.

No other rails, layouts, or data structures change; only the shared card shape and widths are updated.