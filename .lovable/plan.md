## Remove Preview button from featured film hero

The user selected the "Preview" secondary link in the desktop info panel of `src/components/featured-film.tsx` (lines 394-399). It is hardcoded with bilingual text:
- English: "Preview"
- Persian: "پیش‌نمایش"

### Changes
1. **Delete the second `<Link>`** inside the button row of the desktop info column, keeping only the primary "Watch Now" / "ورود و پخش" button.
2. **Verify no other Preview button exists** for the featured film hero on mobile or other breakpoints — the mobile layout currently only shows the "Watch Now" pill, so no extra removal is needed.
3. **Run a quick build/typecheck** to ensure the JSX remains balanced after deletion.

### Files to edit
- `src/components/featured-film.tsx`

### Verification
- Load the homepage on desktop in both English and Persian.
- Confirm only the primary "Watch Now" / "ورود و پخش" button remains in the featured film info panel.
- Confirm no layout shift or broken alignment between the hero image and info panel.