## Fix: Stop Featured Film auto-sliding

The featured film hero currently auto-advances every 6.5 seconds (via `AUTOPLAY_MS` in `src/components/featured-film.tsx`). The user wants it to stay put on one slide and only change when they interact with the arrows/dots/swipe.

### Change

In `src/components/featured-film.tsx`:
- Remove the autoplay `setTimeout` effect (the `useEffect` that calls `next()` after `AUTOPLAY_MS`).
- Remove the `AUTOPLAY_MS` constant and `paused` state (no longer needed for autoplay).
- Remove the `onMouseEnter`/`onMouseLeave` pause handlers on the `<section>` (they only existed to pause autoplay).
- Keep swipe handlers, but drop the `setPaused` calls inside them.
- Manual navigation stays fully functional: arrows, dot indicators, and touch swipe still change slides.

### Verification

- Load `/` and confirm the hero stays on slide 1 indefinitely.
- Click next/prev arrows → slide changes.
- Click a dot → jumps to that slide.
- Swipe on mobile → still works.
- Build + typecheck pass.
