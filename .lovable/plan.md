Edit only `src/components/featured-film.tsx`.

1. **Category-aware kicker label** (replaces hardcoded "Original / اختصاصی" at line 365):
   ```
   film.category === 'walking-tour'
     ? (locale === 'fa' ? 'پیاده‌روی گردشگری' : 'Walking Tour')
     : (locale === 'fa' ? 'اختصاصی' : 'Original')
   ```

2. **Stabilize the desktop info panel** so title/meta/Watch button don't shift between slides:
   - Drop `md:justify-center` on the info column wrapper.
   - Replace `grid grid-rows-[1.25rem_minmax(0,1fr)_1.75rem_3rem]` with a top-aligned flex column using fixed height reserves:
     - kicker row `h-5`
     - title box `h-[6.5rem] lg:h-[7.5rem]` with `line-clamp-3` and `items-start` (1–3 line titles occupy identical vertical space)
     - meta row `h-7`
     - Watch button row `h-12`
   - Add a top padding so the block sits at a consistent offset from the frame top.
   Result: Watch button is pinned to the same Y coordinate on every slide.

3. **Autoplay** in `FeaturedSlider`:
   - `useEffect` starts a 5000ms interval that calls `next()`.
   - Pause when: hovered (`onMouseEnter/Leave` on the section), off-screen (IntersectionObserver), or `prefers-reduced-motion: reduce`.
   - Any manual interaction (arrow click, dot click, swipe) resets the timer via a `bumpTimer` ref so it doesn't immediately jump.
   - Existing 700ms opacity cross-fade provides the smooth transition — no visual redesign.

No other files, styles, or data-layer changes.