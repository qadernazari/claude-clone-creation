Move the mobile "تماشای فیلم" button in `src/components/featured-film.tsx` from the bottom-right corner to a centered bottom pill so it no longer overlaps the film cover art.

Changes:
- Replace the absolute `bottom-4 right-4` mobile button container with a centered pill anchored to the bottom edge of the frame (`left-1/2 -translate-x-1/2 bottom-4`).
- Keep the compact glass styling (border, semi-transparent background, backdrop blur) and the play icon.
- Preserve the existing `aria-label`, `focus-visible` ring, hover/active states, and the Link to `/films/$slug`.
- Leave the desktop layout unchanged.

Verification:
- Run build and typecheck.
- Capture a mobile viewport screenshot of the homepage hero to confirm the button is centered and no longer covers the poster.