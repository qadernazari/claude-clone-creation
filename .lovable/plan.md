
## Problem

Rail cards render `film.cover_url`, which is the **portrait 2:3 poster** uploaded in admin. The CSS forces it into a 16:9 box via `object-cover`, so portrait posters get cropped top/bottom and look wrong. Meanwhile, admin already collects a proper **16:9 landscape image** (`thumbnail_url`, labeled "Desktop Cover (16:9)"), but the rails ignore it.

## Fix

### 1. `src/components/films-row.tsx`
In `PosterCard`, prefer `film.thumbnail_url` (true 16:9) for the rail image, and fall back to `cover_url` only if a film has no landscape uploaded yet:

```tsx
const railImg = film.thumbnail_url || film.cover_url;
```
Use `railImg` in the `<img src>` and the conditional. No other layout changes — cards stay 16:9, title stays below.

### 2. `src/lib/home.functions.ts` — `getHomeRails`
Both `cover_url` and `thumbnail_url` are already being transformed to 680×383 "cover". Keep `thumbnail_url` at that transform (it's now the primary rail image). Change `cover_url` back to a portrait-friendly transform (`400, 80` default `contain`) so it isn't cropped when used elsewhere / as fallback.

### 3. `src/routes/_authenticated/admin/films.tsx` — admin labels
Make the intent crystal clear for future films:
- Rename "Upload Desktop Cover (16:9)" → **"Upload Rail / Hero Image (16:9) — required"** with description noting it's used on homepage rails, browse grid, and desktop hero. Recommend 1920×1080.
- Rename "Upload Cover Poster (Portrait)" → **"Upload Poster (2:3, optional)"** with description noting it's used for share previews / poster views only, and that the 16:9 image will be used everywhere else.
- Reorder so 16:9 comes first in the Media section.

No schema changes, no data migration. Existing films that only have a portrait `cover_url` keep working via the fallback; admins can upload the 16:9 version whenever.

## Files touched
- `src/components/films-row.tsx`
- `src/lib/home.functions.ts`
- `src/routes/_authenticated/admin/films.tsx`
