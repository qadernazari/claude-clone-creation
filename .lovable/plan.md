I found the exact issue: the small grey line at the top of the Region bottom sheet is only visual right now. It does not have any drag/swipe behavior attached.

Plan:

1. Add mobile drag-to-dismiss behavior to the Region bottom sheet only.
   - Track touch start/move/end on the sheet handle/top area.
   - If the user swipes downward past a small threshold, close the sheet.
   - If the swipe is too small, snap the sheet back into place.

2. Keep existing behavior unchanged.
   - The X close button will still work.
   - Tapping the dark backdrop will still close it.
   - Selecting Global/Iran will still close it.
   - No changes to desktop region controls.

3. Improve the handle affordance slightly.
   - Make the handle/top strip behave like a real draggable target.
   - Use touch-action settings so mobile browsers do not block the gesture.
   - Keep the same visual design unless needed for usability.

Technical details:
- Edit `src/components/site-header.tsx` to add touch gesture state and handlers to the Region sheet.
- Edit `src/styles.css` only if needed for `touch-action`, cursor/handle affordance, and smooth snap-back transition.
- Scope the fix only to the Region bottom sheet shown in your screenshot.