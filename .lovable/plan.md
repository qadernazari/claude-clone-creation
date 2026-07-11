Plan: Cinematic desktop hero with info overlaid on the film frame

Current state
- `src/components/featured-film.tsx` renders the film image on top, then a full text column below it on all breakpoints (title, badges, director/year, synopsis, Watch Now / More info / Watchlist).
- The selected elements in the preview are the title, "Original / Featured Film" badges, and "Watch Now" button in that lower text column.

Proposed change
On desktop, move only the essential info onto the film image itself and remove the separate text column. Keep the mobile layout stacked for readability.

Design rationale
Yes — this will look cleaner and more cinematic. Filimo-style homepages keep the hero poster as the focal point and put only the title + primary CTA on it; the rest of the metadata (director, year, synopsis, more info) lives on the film detail page. This reduces vertical clutter and makes the homepage feel faster.

Implementation

1. Desktop overlay
   - Add a bottom-to-top gradient scrim inside the film frame (from black/80 at the bottom to transparent).
   - Position the title and "Watch Now" button in the bottom-left corner of the frame, above the scrim.
   - Keep the "Original" / "Featured Film" badges small and place them top-left of the frame.
   - Keep the slider controls at the bottom center of the frame as already planned.

2. Remove the desktop text column
   - Hide the entire `SlideDetails` block below the image on `md` and up.
   - Keep `SlideDetails` exactly as-is for mobile (`max-md:`).

3. Preserve mobile layout
   - Mobile keeps the current stacked layout: image → title → badges → synopsis → buttons.
   - Slider controls stay below the image on mobile to avoid covering the 2:3 poster.

4. Accessibility & performance
   - Ensure overlay text has 4.5:1 contrast against the scrim.
   - Keep the hero image eager/sync/high fetchPriority.
   - Avoid new absolute-positioned elements causing CLS by sizing the frame with the existing aspect-ratio container.

Files to edit
- `src/components/featured-film.tsx`

Out of scope
- No changes to film detail page (`films.$slug.tsx`) — that already shows the full info.
- No changes to slider autoplay, swipe logic, or film data.

Next step
Approve this plan and I will implement the overlay layout.