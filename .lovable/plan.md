Make the rail thumbnails actually 16:9 at the transform layer so we download pre-cropped landscape images instead of relying on CSS `object-cover` to crop portrait sources.

In `src/lib/home.functions.ts`, inside `getHomeRails`, change the `renderResizedUrl` calls for each rail film from:

```
renderResizedUrl(supabaseAdmin, cache, f.cover_url, 400, 80)
renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url, 400, 80)
```

to request a 16:9 crop at a size that matches the card widths (up to 340px CSS × 2 DPR ≈ 680w):

```
renderResizedUrl(supabaseAdmin, cache, f.cover_url, 680, 78, 383, "cover")
renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url, 680, 78, 383, "cover")
```

Effect: Supabase Storage returns 680×383 (16:9) images cropped to fill, so every card is truly 16:9 regardless of the original poster aspect ratio, and no bandwidth is wasted on cropped-off pixels. No changes to `films-row.tsx` or the data schema.
