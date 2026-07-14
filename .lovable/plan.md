Only `src/components/featured-film.tsx`, desktop info panel (the `INFO COLUMN — desktop only` block).

1. **Stop title cropping.** Current `h-[6.5rem] lg:h-[7.5rem]` + `leading-[1.3]` can't hold 3 lines at `xl:text-[2.25rem]`.
   - `<h2>`: change `leading-[1.3]` → `leading-[1.2]`, keep `line-clamp-3`.
   - Title reserve wrapper: `h-[6.75rem] lg:h-[7.75rem] xl:h-[9rem]`.

2. **Fill the empty space + keep Watch button stable.** Restructure the inner stack as a full-height flex column:
   - Container: `flex h-full flex-col` (currently just `flex flex-col`).
   - Order:
     a. Kicker `h-5` (unchanged)
     b. Title reserve (new heights above)
     c. Meta row `h-7` (unchanged)
     d. **Synopsis paragraph** — new: `mt-4 flex-1 overflow-hidden`, inside it a `<p className="line-clamp-4 text-sm lg:text-[15px] leading-[1.65] text-cream/70">` reading `t({ en: film.synopsis_en ?? '', fa: film.synopsis_fa ?? film.synopsis_en ?? '' })`. `flex-1` absorbs remaining panel height so the button is pushed to the bottom whether or not synopsis text exists.
     e. Watch button row `mt-auto flex h-12 items-center` (was `mt-5 h-12`) — `mt-auto` pins it to the panel bottom.

Result: three-line titles fit at every breakpoint, empty space fills with synopsis (or an invisible flex spacer when missing), and the Watch button lands at the same Y on every slide because the panel is fixed height and the button is anchored to its bottom.

No other files, no styles.css / data / i18n changes.