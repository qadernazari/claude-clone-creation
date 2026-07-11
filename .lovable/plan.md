Implement the selected "Cinematic glassmorphism hero" design into `src/components/featured-film.tsx` only.

What will change:
- Refactor `SlideImageFrame` to use a cleaner full-bleed framed image with an inner subtle border and outer amber corner accents.
- Move the slide navigation into a glassmorphism control bar anchored at the bottom-left of the frame.
- Move the title and primary CTA to the bottom-right of the frame, with a stronger typographic hierarchy.
- Simplify the top badges to a minimal "Featured Film" label + "Original" amber pill in the top-right.
- Add cinematic bottom and left gradients for text contrast without a heavy overlay.
- Update `SliderControls` to match the new glass bar style (rounded-2xl, larger active dot with amber ring).
- Keep all existing functionality: autoplay, swipe gestures, lazy loading, image srcset, cover_fit/cover_position, walking-tour director/language logic, and mobile stacked details.
- Preserve the existing design tokens (bg-0, cream, amber, etc.) — no hardcoded colors.
- Update the `FeaturedFilmFallback` skeleton to mirror the new frame shape.

What will NOT change:
- No other pages or components (header, rails, footer, film detail, watch page, admin) will be touched.
- No backend or data-fetching changes.

Verification:
- Run `bun run build` and `tsgo` to confirm no TypeScript or build errors.
- Capture desktop and mobile screenshots of the homepage to confirm the new hero layout renders correctly and the controls are usable.