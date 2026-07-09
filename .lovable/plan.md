Plan: Make the site header always opaque so the hero image cannot bleed behind the navigation bar.

## What to change
1. Read `src/components/site-header.tsx` to confirm the current header wrapper className (currently a transparent/gradient style that becomes solid only on scroll).
2. Replace the dynamic background with a single, always-opaque style: `bg-bg-0/90 backdrop-blur-xl border-b border-cream/8` on the fixed header.
3. Keep the existing `mt-16 md:mt-20` offset on the hero in `src/components/featured-film.tsx` so content starts below the header.

## Verification
- Run a typecheck / build to ensure no syntax error.
- Capture screenshots of the homepage at desktop, tablet, and mobile to confirm the header is a solid dark bar and the hero image starts below it without overlap.

No other UI or data changes are needed.