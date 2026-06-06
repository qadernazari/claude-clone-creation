## Problem

On mobile, every section renders two headings that say the same thing:

- A small uppercase eyebrow (e.g. `IRANIAN ORIGINALS`, `NEW RELEASES`, `COLLECTIONS`, `CONTINUE WATCHING`)
- The real `<h2>` title right below it (e.g. `Iranian Originals`)

This duplicates the section name and crowds the mobile layout. Desktop has more room and the eyebrow looks intentional there, so it should stay.

## Fix

Keep one clean title on mobile, keep the eyebrow on desktop. No copy changes, no layout restructure — just hide the eyebrow under `md`.

### Files to update

1. **`src/components/films-row.tsx`** (Rail header)
   - The `<span>` rendering `eyebrow` ("Iranian Originals" / "Iranian Originals" / "Collection" / "New Releases") → add `hidden md:block` so it only shows from `md` up.

2. **`src/components/collections-grid.tsx`**
   - The `<span>` rendering "Collections" / "مجموعه‌ها" above the `Curated collections` h2 → add `hidden md:block`.

3. **`src/components/continue-watching.tsx`**
   - If it renders an uppercase eyebrow above its title, hide it on mobile the same way. (Will verify the exact markup when implementing.)

4. **Any other section with the same pattern** (e.g. browse page section headers, featured rails) — audit during implementation and apply the same `hidden md:block` rule to the eyebrow `<span>` only. The h2 stays visible on all viewports.

### What stays the same

- Desktop (`md` and up) is unchanged — eyebrow + title as today.
- Titles, spacing scale, font sizes, and RTL/LTR behavior are untouched.
- No changes to data, i18n strings, or component structure.

### Out of scope

- No redesign of the section header.
- No changes to card layout or rails themselves.
- No copy edits to titles or eyebrows.
