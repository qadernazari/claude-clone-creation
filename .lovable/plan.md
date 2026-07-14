# Mobile Featured Film — Match Your Sketch

Your sketch shows two clear changes for the mobile hero (desktop stays exactly as it is today):

1. **Arrows move onto the image** as left/right chevrons, vertically centered, floating over the poster.
2. **Remove the pill below the image** (the arrows + dots bar under the frame).

The Watch button stays where it is — centered near the bottom of the image.

## Changes in `src/components/featured-film.tsx`

### 1. New mobile side-arrow controls
Add two small circular chevron buttons absolutely positioned inside the image frame:
- Left arrow: `absolute left-2 top-1/2 -translate-y-1/2`
- Right arrow: `absolute right-2 top-1/2 -translate-y-1/2`
- ~36×36px, rounded-full, `bg-bg-0/45 backdrop-blur-md border border-cream/10`, amber chevron icon, `active:scale-95`
- Wrapped in `dir="ltr"` so left always = previous and right always = next in both English and Persian (consistent with the current desktop behavior)
- Rendered only on mobile (`md:hidden`) and only on the active slide
- `z-30` so they sit above the gradient but below the Watch pill's tap target

### 2. Keep dots, drop the pill
- Remove the entire "Mobile-only stacked controls below frame" block at the bottom of `SlideImageFrame` (the `<div className="mt-6 flex justify-center md:hidden">…</div>` wrapper).
- Render just the slide dots as a thin row absolutely positioned inside the image, above the Watch pill (e.g. `absolute bottom-16 left-1/2 -translate-x-1/2`), so the user still sees position/progress but there's no floating pill under the image.
- Dots reuse the existing active/inactive styling from `SliderControls` (amber elongated bar for active, small cream dot for inactive).

### 3. Desktop untouched
- The desktop arrow+dots pill at `bottom-4 left-4` inside the image stays exactly as it is.
- The desktop info column stays exactly as it is.
- The `SliderControls` component itself keeps working for desktop; only the mobile rendering path changes.

### 4. Small cleanup
- Because the pill below the frame goes away, tighten `pb-12 md:pb-10` on the hero container if it now leaves too much air under the image on mobile — likely reduce mobile bottom padding to `pb-6`.

## What this does not change
- Autoplay (5s), pause on hover/off-screen, swipe gestures — unchanged.
- Watch button label logic, Persian digits, category kicker — unchanged.
- Desktop layout, sizes, and info panel — unchanged.
- Image sources, gradients, aspect ratios — unchanged.

## Verification
- Run the app on mobile viewport (516×941) in both `fa` and `en`: left arrow always goes to previous slide, right to next.
- Confirm the pill under the image is gone and dots sit inside the image above the Watch button.
- Screenshot via Playwright at mobile width to confirm the layout matches the sketch.
