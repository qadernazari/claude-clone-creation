# Remove leftover Preview/trailer UI remnants

## Audit result

A full read-only sweep of `src/` found **no viewer-facing Preview or trailer strings** still rendering — no JSX text, button labels, aria-labels, tooltips, or Persian variants (`پیش‌نمایش`, `تیزر`, `تماشای تیزر`, …). No dead state, handlers, refs, or lightbox component imports remain either. The previous cleanup was thorough.

## The one leftover

`src/routes/films.$slug.tsx:43` still selects `preview_url` from the film row, but nothing reads it anywhere in viewer code — it's a dead column left over from the removed trailer lightbox. Not a UI string, but the request was to remove leftover trailer UI remnants, and this is the last one.

## Change

- **`src/routes/films.$slug.tsx`** — remove `preview_url` from the `.select(...)` column list on the film detail query (line 43). No other code touches the field, so no follow-up edits are needed.

Admin uploader code under `src/routes/_authenticated/admin/**` keeps its `preview_url` handling untouched — that's the storage side, not viewer UI. Email-template `<Preview>` components (react-email metadata, not user-visible) also stay.

## Verification

- `rg -n "preview_url|previewUrl" src` after the edit should return only admin routes and, if any, non-viewer files.
- Typecheck via the normal build.
