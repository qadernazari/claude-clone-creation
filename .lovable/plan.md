## Problem

The featured hero section starts at the very top of the page and sits behind the transparent/sticky site header, so the film image blends into the menubar — the title art appears to touch the logo/nav.

## Fix

In `src/components/featured-film.tsx`, offset the hero below the header so the image no longer visually mixes with the navigation:

- Add top padding to the hero `<section>` wrapper for both `FeaturedSlider` and `SingleSlide` (roughly `pt-16 md:pt-20` = header height) so the image starts under the menubar.
- Alternatively, reduce hero height slightly (`h-[58svh] md:h-[68dvh]`) to compensate so the overall block doesn't grow.
- Strengthen the top gradient overlay (bump the top stop from `rgba(13,13,13,0.55)` to `~0.75`) so if any overlap remains, the header area reads as dark chrome, not film content.

No changes to data, layout structure, or other components.