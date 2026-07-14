## Plan: Mobile hero redesign (Filimo-style)

### Goal
Make the mobile homepage hero feel closer to the Filimo reference: full-bleed portrait image, a single wide centered CTA below it, and slide dots underneath the button. Keep the existing desktop split-panel layout untouched.

### Changes

1. **Mobile hero container**
   - Remove horizontal padding on mobile so the image touches the viewport edges (`px-0` below `md:`).
   - Keep `max-w-[110rem]` and side padding from `md:` upward for desktop.
   - Reduce bottom padding to a normal section gap since the button will sit below the image, not overlapping it.

2. **Mobile image frame**
   - Drop the rounded border/frame and shadow on mobile (`md:` keeps them).
   - Keep `aspect-[2/3]` portrait ratio.
   - Keep the bottom gradient fade so any overlaid text remains readable.
   - Remove mobile side arrows from inside the image (swipe still works).
   - Remove mobile dots from inside the image.

3. **Mobile info / title**
   - The current desktop-only info panel stays desktop-only.
   - On mobile, render a compact title block centered over the lower part of the image (kicker + title only, no synopsis), matching the reference's centered logo/title feel.

4. **Mobile CTA**
   - Move the Watch button out of the image entirely.
   - Render it as a wide, rounded pill centered below the image (`w-full max-w-md mx-auto`, `rounded-2xl`, `bg-amber`, `text-ink`).
   - Use the existing dynamic label (`watchCtaLabel` / `watchCtaShort`) so it still says "Watch / Login & Watch / Buy subscription & Watch" correctly in both languages.

5. **Mobile slide dots**
   - Move dots to a centered row below the CTA.
   - Keep the same active/inactive dot styling and click behavior.
   - Hide dots when there is only one slide.

6. **Preserve behavior**
   - Autoplay (5s), pause on hover/focus/off-screen, swipe gestures, and keyboard accessibility stay as-is.
   - Desktop layout, controls, and info panel are not changed.

### Verification
- Build and typecheck pass.
- Playwright mobile screenshot confirms: image full-bleed, wide button below, dots below button, no overlap, no cropping.

### Scope exclusion
- No changes to desktop hero.
- No changes to color palette, fonts, or rails.
- No new dependencies.