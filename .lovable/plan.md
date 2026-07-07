## Bug

After the previous fix that forced the control bar to LTR, two seek handlers still flip direction when the page is in RTL — so in Persian, dragging the scrubber right seeks backward, and dragging left seeks forward. Same inversion applies to the mobile double-tap seek.

## Fix

In `src/routes/_authenticated/watch.$slug.tsx`, remove the RTL branches from both seek handlers so the timeline always behaves as LTR (matching the visual scrubber that already fills left→right):

1. **`scrubToClientX`** (line 453) — delete `if (dir === "rtl") pct = 1 - pct;`
2. **Double-tap seek** (line 489, inside `onPlayerPointerDown`) — delete `if (dir === "rtl") side = side === "left" ? "right" : "left";`

After this, tapping/dragging right = forward, left = back, regardless of language — consistent with the visual progress bar and industry-standard player behavior.
