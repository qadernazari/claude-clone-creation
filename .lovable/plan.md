## Remove synopsis from featured film hero panel

The selected paragraph is the film synopsis inside the desktop info panel of `src/components/featured-film.tsx`. Removing it will free vertical space so the film title can display fully without line-clamping.

### Changes

1. **Remove the synopsis block** from the desktop info column in `src/components/featured-film.tsx`.
   - Delete the `<p>` element that renders `synopsis` (currently `line-clamp-3`).
   - Remove the `synopsis` variable if it is no longer used anywhere else in the component.

2. **Let the title expand**:
   - Remove `line-clamp-2` and `overflow-hidden` from the `<h2>` title.
   - Allow the title row to grow naturally so long film names are not cropped.

3. **Adjust the info column layout**:
   - Replace the fixed 5-row grid (`grid-rows-[1.25rem_6.25rem_5.25rem_1.75rem_3rem]`) with a simpler flex or 4-row grid that fits eyebrow, title, meta, and buttons.
   - Keep vertical centering and spacing consistent.

4. **Verify responsive behavior**:
   - Desktop: title fully visible, no truncation; panel remains balanced.
   - Mobile: no change needed — the synopsis is only shown in the desktop info column.

### Files to edit
- `src/components/featured-film.tsx`

### Verification
- Load the homepage on desktop and cycle through featured films.
- Confirm film titles are no longer truncated.
- Confirm the info panel still aligns with the image frame and no layout shift occurs between slides.