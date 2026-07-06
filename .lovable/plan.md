## Why the cover still looks soft

The hero `<img>` on `/films/zayandeh-rud` is currently served from:

```
/storage/v1/render/image/sign/film-thumbnails/…webp?width=1920&quality=90
```

Its **natural resolution is only 1600×900** — that's the actual size of the file stored in the bucket for this film. Supabase's transform endpoint does not upscale, so asking for `width=1920` returns the 1600px source re-encoded as WebP.

The desktop hero then stretches that 1600×900 image to roughly **1612×1854 devicepixels** (viewport 1318 CSS px × dpr 2, plus the `h-[112%]` + `object-cover` Ken Burns crop chops off the sides). So the browser is sampling a ~1600px source across a ~1854px tall crop — that's what reads as "low quality." The 68 → 90 quality bump helped a little, but the source file is the ceiling.

There are two independent fixes; pick whichever you want (or both):

### Option A — Re-upload higher-resolution masters (recommended)
The real fix. In Admin → Films → Zayandeh Rud, replace **Thumbnail (desktop 16:9)** and **Mobile cover (9:16)** with source files at least:
- Desktop: **2400×1350** (3200×1800 is better for retina)
- Mobile: **1200×2133**

Nothing to code — quality snaps up immediately because the transform pipeline finally has pixels to work with. This is the only fix that helps every film going forward.

### Option B — Stop double-compressing small sources
Right now `renderResizedUrl` re-encodes even when the requested width is bigger than the source, which just adds a second WebP compression pass on top of whatever quality the file was uploaded at. Two small code changes remove that penalty:

1. **`src/lib/storage-render.server.ts`** — probe the object's stored dimensions with `supabase.storage.from(bucket).info(path)` (or a HEAD on the object URL) and:
   - If `sourceWidth <= requestedWidth`, return the **original signed object URL** untouched (no re-encode at all).
   - Otherwise, transform as today at `quality: 90`.
2. **`src/routes/films.$slug.tsx`** — on desktop, drop the `h-[112%]` + `-top-[10%]` overscan when the source is smaller than the viewport width, so we don't crop away pixels we can't afford to lose. Keep the Ken Burns effect only for images ≥ 2000w.

Option B narrows the loss but cannot invent detail — a 1600px master will still look soft on a 4K monitor.

### Also worth checking
- **Storage bucket transform quota** — Supabase's image transform has a monthly render quota; if it's exhausted, transforms silently fall back to the untransformed original. Not likely here (the URL clearly shows `/render/image/`), but worth glancing at if quality regressions appear later.
- **`file-upload.tsx`** does not currently enforce a minimum resolution on cover uploads. We could add a client-side check that warns when a cover is uploaded below 2400w so this doesn't happen again.

### My recommendation
Do **Option A first** (re-upload Zayandeh Rud's cover at 2400w+). If you also want the pass-through-when-source-is-small behavior so future small uploads at least don't get double-compressed, I'll implement Option B in the same pass. Tell me which — or "both" — and I'll switch to build mode.