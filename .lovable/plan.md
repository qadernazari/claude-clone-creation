## Problem

In Persian (RTL) mode, the video player's bottom control bar mirrors along with page direction, so:
- Fullscreen, speed (×1), and CC end up on the **left**
- Play/pause, volume, time end up on the **right**

That's wrong. A video timeline is inherently left-to-right (progress flows forward in time regardless of language), and industry-standard players (YouTube, Netflix, Aparat) keep the transport controls in a fixed layout even in RTL locales.

## Fix

Force the player chrome to stay LTR regardless of page language. Persian text inside labels/menus still renders correctly (browsers handle inline text direction from the characters themselves).

### Changes in `src/routes/_authenticated/watch.$slug.tsx`

1. **Bottom control row** (the `<div>` at line ~852 wrapping the scrubber + controls): add `dir="ltr"` so:
   - Play/pause, skip ±10s, volume, current/total time stay on the **left**
   - CC, speed (×1), fullscreen stay on the **right**

2. **Scrubber progress fills** (lines ~867–881): remove the RTL branches — always fill from `left: 0` with `width: pct%`, and position the thumb with `left: calc(pct% - 7px)`. Timelines should always flow left→right.

3. **Speed / CC dropdowns** (lines ~1004, ~1045): they use `end-0` which resolves to `left-0` in RTL and would open off-screen once the parent is forced to LTR. Change to `right-0` so menus anchor to their button on the right side.

4. **Top overlay bar** (line ~813): leave as-is. The back arrow correctly points in the reading direction (already handled via `scaleX(-1)` in RTL), and the title should follow the language direction — that behavior is fine.

### Out of scope

No changes to the rest of the page (film info, comments, related rail) — those are content and should follow page direction as they currently do.
