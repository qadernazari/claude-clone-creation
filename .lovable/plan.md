## Problem

On desktop, hovering a film poster in the home page rails plays the lift animation (`-translate-y-1.5` + larger shadow), but the top of the card gets clipped. The cause is the scroll container in `src/components/films-row.tsx` (around line 110):

```
className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 md:-mx-12 md:snap-mandatory md:gap-6 md:px-12"
```

`overflow-x-auto` implies `overflow-y: auto`, so the vertical lift gets cut by the rail's bounds. The shadow grow is also clipped for the same reason.

## Fix

In `src/components/films-row.tsx`, update the rail's scroll container so vertical overflow is not clipped while horizontal scrolling still works, and add a small top breathing room so the lifted card has space:

- Add `overflow-y-visible` (explicit) alongside `overflow-x-auto`.
- Add `pt-2 md:pt-3` so the lifted poster + its enlarged shadow have room above.

No other files change. Mobile behavior stays the same (hover effects are already gated to `md:`).
