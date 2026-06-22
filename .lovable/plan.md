## Goal
Remove the duplicate "Sign in to watch" CTA on the film page (mobile). The sticky bottom bar should appear **only when the in-page button is no longer visible** — so the user always has one clear call-to-action, never two competing ones.

## Behavior
- Scroll position at top: in-page button visible → sticky bar **hidden**.
- User scrolls down past the in-page CTA → sticky bar **slides up** into view.
- Scrolls back up so in-page button is visible again → sticky bar **slides away**.
- Desktop: unchanged (sticky bar is already mobile-only).
- Applies to all CTA variants: `Sign in to watch`, `Sign in to buy a ticket`, `Watch now`, `Start free trial`, etc. — whatever the in-page button shows, the sticky mirrors.

## Technical approach
File: `src/routes/films.$slug.tsx`

1. Attach a `ref` to the in-page CTA button (around line 698).
2. Use an `IntersectionObserver` to track whether that button is in the viewport, storing the result in a `inPageCtaVisible` state.
3. In the sticky bottom bar block (line 1061+), gate visibility with `!inPageCtaVisible` — animate with the existing translate/opacity transition for a smooth slide-in/out.
4. Keep a small threshold (~`rootMargin: "-20px 0px 0px 0px"`) so the sticky bar doesn't flicker when the button is right at the edge.

## Out of scope
- No changes to the in-page button itself.
- No changes to desktop layout.
- No changes to copy or auth flow.
