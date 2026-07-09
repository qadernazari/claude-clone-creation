## Problem

The homepage hero and rail images look soft/blurry because the Supabase Storage transform sizes are smaller than what the browser actually renders — especially on 2×/3× retina displays.

Current transform sizes vs. actual display:

| Slot | Transform now | CSS display | @2× DPR needs | Verdict |
|---|---|---|---|---|
| Hero desktop | 1200w, q88 | up to ~1400px | ~2400–2800px | too small |
| Hero mobile | 800w, q85 | ~390px | ~1170px | ok-ish but low q |
| Rail card | 680×383, q78 | up to 340px | ~680px | borderline, q too low |
| Rail thumb (secondary) | 400w, q80 | — | — | unused for display |

The browser upscales the transformed image, which is what makes them look "very down" in quality.

## Fix (in `src/lib/home.functions.ts`)

Bump the transform width/height and quality for the visible slots. No component or layout changes.

1. **Hero desktop** (used in `<Slide>` desktop img, 1600×900 rendered)
   - `cover_url`: 1200 q88 → **1920 q86**
   - `thumbnail_url`: 1200 q88 → **1920 q86**

2. **Hero mobile** (used in `<Slide>` mobile img, 720×1280 rendered)
   - `thumbnail_url_mobile`: 800 q85 → **1080 q82**
   - `mobile_cover_url`: 800×1350 cover q85 → **1080×1620 cover q82**

3. **Rail card** (used in `PosterCard`, up to 340px wide @ 16:9)
   - `thumbnail_url`: 680×383 cover q78 → **760×428 cover q82**
   - `cover_url`: 400 q80 → **520 q80** (fallback only)

4. Apply the same bumps in both `getHomeFeatured` and `getHomeFeaturedSlides` (they duplicate the transform block).

## Why these numbers

- Supabase Storage transforms cap at 2500×2500, so 1920w for hero fits comfortably.
- q82–86 is the sweet spot on JPEG-like re-encoding; q78 was too aggressive on gradient/skin-tone hero art.
- Payload increases roughly ~1.6–2× for hero (~200–350 KB per slide), but they're lazy after the first slide and gated by `loading="lazy"`/`fetchPriority`. LCP image already uses `loading="eager"` and stays the priority hint.

## Not touched

- Component code, layout, card sizing, or slider behavior — the fix is entirely in the server-function transform calls.
- Films detail page / browse grid quality (separate functions; can follow up if you also see them soft).