Refine the featured-film hero for mobile only.

1. In `src/components/featured-film.tsx`, add a glass-style "More info" (`اطلاعات بیشتر`) button anchored to the bottom edge of the hero frame on mobile, mirroring the desktop glass-control aesthetic.
2. Hide the heavy mobile `SlideDetails` block (title, synopsis, metadata) that currently sits below the frame. The only remaining action for the slide on mobile will be the in-frame "More info" button.
3. Keep the existing desktop layout untouched: title/CTA bottom-right, controls bottom-left, all inside the frame.
4. Verify the button is reachable, readable, and does not overlap slide dots/controls on small screens.