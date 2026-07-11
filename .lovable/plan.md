## Problem

On the homepage, each film rail (`ContinueWatching`, `NewReleaseRow`, `WalkingTourRow`, `FilmsRow`) is wrapped in a `<div className="pt-6 md:pt-10">`. That's 24px mobile / 40px desktop of blank padding stacked on top of whatever internal spacing each rail component already provides — visible as an obvious empty gap above each row. There are also stray blank lines in the JSX (lines 106–107, 168–173) that are just noise.

## Fix (single file: `src/routes/index.tsx`)

1. **Remove the `pt-6 md:pt-10` wrapper divs** around each rail and each Suspense fallback in `DeferredHomeRails`. Render `<ContinueWatching />`, `<NewReleaseRow />`, `<WalkingTourRow />`, and `<FilmsRow />` (plus their skeleton fallbacks) directly inside `<Suspense>`. Any needed breathing room between rails is already handled by each row's own top margin/heading spacing.
2. **For the last rail group** (currently `<div className="space-y-10 pb-16 pt-6 md:space-y-14 md:pb-24 md:pt-10">` wrapping `<FilmsRow />`), drop `pt-6 md:pt-10` but keep `pb-16 md:pb-24` so the page still ends with bottom breathing room. `space-y-*` isn't needed since there's only one child.
3. **Delete the empty blank lines** at 105–107 and 168–173 for cleanliness.

Nothing else changes — no component logic, no skeleton dimensions, no data flow. Purely removing dead vertical space and dead lines.

## Result

The hero flows straight into the first rail with only the rail's own natural spacing, eliminating the visible gap the user pointed to, and the same tightening applies between every subsequent rail.