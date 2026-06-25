## Fix: Persian (RTL) account menu opens on wrong side

### Problem
In `src/components/auth-menu.tsx`, the desktop dropdown panel is rendered through a React portal at `md:end-4 md:top-20`. Because the portal target is `document.body` (not the avatar's RTL container), the logical `end` property resolves against the viewport's writing direction:
- English (LTR): `end` = right → panel appears under the avatar (correct).
- Persian (RTL): `end` = left → panel jumps to the left edge of the screen, far from the avatar.

### Fix
Detect the active direction and anchor the desktop panel to the matching side of the viewport.

In `src/components/auth-menu.tsx` (panel className around line 313):
- Replace the hardcoded `md:end-4` with a direction-aware class:
  - When `locale === "fa"` → `md:left-4` (RTL avatar is on the left).
  - Otherwise → `md:right-4`.

This keeps everything else (mobile bottom sheet, animations, sizing) untouched. No changes to the auth flow, region switcher, or any other component.

### Verification
- Switch region to ایران → open the avatar menu on desktop → panel opens on the left, directly under the Q avatar.
- Switch back to Global → panel opens on the right, directly under the avatar.
- Mobile bottom sheet behavior unchanged.
