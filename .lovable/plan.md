## Responsive framed hero: 16:9 desktop / 2:3 mobile

Right now the homepage hero frame is 2:3 on every breakpoint and pulls only `cover_url`. Switch to a breakpoint-aware frame that uses the landscape thumbnail on desktop and the portrait cover on mobile, and mirror the treatment where a similar hero exists.

### 1. Homepage hero — `src/components/featured-film.tsx`

Frame becomes responsive:
- Mobile: `aspect-[2/3]`, max width ~380px, centered (unchanged from current).
- Desktop (`lg:`): `lg:aspect-video` (16:9), full column width — no `max-w-[420px]` cap on desktop.
- Since 16:9 desktop no longer needs to sit beside the text column, promote to a single-column stacked layout on desktop too: **image on top (16:9 wide), text + CTAs + slider controls below**. This reads better for a wide poster and matches classic hero patterns.

  ```
  Desktop                       Mobile
  ┌───────────────────────┐    ┌──────────┐
  │      16:9 frame       │    │  2:3     │
  └───────────────────────┘    │  frame   │
  ORIGINAL · Featured           └──────────┘
  Title                         ORIGINAL
  meta · year · min             Title
  synopsis                      synopsis
  [Watch Now] [More info]       [Watch] [Info]
  ‹ ›  ▬ · · · ·                ‹ ›  ▬ · · · ·
  ```

Image source picker inside `Slide`:
- Desktop `<img>` (hidden on mobile, `hidden lg:block`): `film.thumbnail_url` with existing 1280/1920/2400 srcSet.
- Mobile `<img>` (`lg:hidden`): `film.cover_url` (portrait) → falls back to `mobile_cover_url` → `thumbnail_url`.
- `cover_fit` / `cover_position` still honored.
- Corner accents and ambient amber glow retained, sized proportionally per aspect.

Text max-width bumps to `max-w-3xl` on desktop since it now spans the full width below the frame; keep 3-line synopsis clamp.

### 2. Film detail page — `src/routes/films.$slug.tsx`

Currently a full-bleed cover image with overlaid text. Bring it in line with the framed treatment so the two hero surfaces feel like the same product:
- Wrap the cover in the same frame chrome (`rounded-[2rem] border border-cream/10 bg-cream/5 p-3 shadow-2xl`, amber glow, corner accents).
- Aspect: `aspect-[2/3]` on mobile, `lg:aspect-video` on desktop.
- Source: existing `thumbnail_url` (desktop) / `cover_url` (mobile), respecting `cover_fit` and `cover_position`.
- Keep title/meta/CTAs; move them below the frame on desktop, keep overlay-on-image only if the image is `cover_fit === "cover"` and no cinematic overlay is desired — safer path: text always **below** the frame for consistency with home.
- Keep header transparency behavior (already handled via `isFilmPage`).

### 3. Admin film form preview — `src/routes/_authenticated/admin/films.tsx`

The admin Media section shows an inline preview of the uploaded assets. Update the preview thumbnails to match:
- Cover (portrait) upload preview: `aspect-[2/3]` framed tile with the same rounded border chrome (small scale).
- Thumbnail/landscape upload preview: `aspect-video` framed tile with the same border chrome.
- Add a short helper caption per field: "Shown on mobile hero (2:3)" for the cover, "Shown on desktop hero (16:9)" for the thumbnail.
- No changes to upload logic, storage paths, or `compressImage` limits.

### 4. Not in scope
- Rails / grids (`films-row.tsx`) — already 16:9, unchanged.
- Watch page, browse, originals, footer, nav.
- Data model / server functions.

### Files touched
- `src/components/featured-film.tsx`
- `src/routes/films.$slug.tsx`
- `src/routes/_authenticated/admin/films.tsx`

### Verification
- Playwright screenshots at 1280×1800 (desktop) and 390×844 (mobile) for `/` and one `/films/:slug`.
- Visual check on `/admin/films` (authenticated) preview tiles.
