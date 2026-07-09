The quality drop is likely from two things: the homepage is using transformed/cropped storage URLs for speed, and the rail/hero images may still be stretching a source image that is not high enough resolution or is being cropped from the wrong asset.

Plan:
1. Verify the actual rendered hero/rail image URLs and intrinsic dimensions in the preview once it finishes reloading.
2. Update the homepage image pipeline so:
   - hero desktop uses the uploaded 16:9 thumbnail first at a larger transform size,
   - mobile only uses a portrait/mobile image when it exists, otherwise uses the 16:9 image instead of a low-quality fallback,
   - rail cards use a sharper transform size/quality appropriate for retina screens.
3. Add `srcSet`/responsive sources in `featured-film.tsx` and `films-row.tsx` if needed, so browsers pick the right resolution instead of stretching one image everywhere.
4. Verify visually in the preview and report exactly what caused it and what changed.