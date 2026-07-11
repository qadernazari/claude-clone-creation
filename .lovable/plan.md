Move the featured-film slider controls from below the text column onto the bottom of the framed film image.

### Current state
- `src/components/featured-film.tsx` renders `SliderControls` inside `FeaturedSlider` after the text column, in normal document flow.
- The selected element (line ~119-120) is the text column wrapper, sitting between the framed image and the controls.

### Changes
1. **Relocate controls**  
   Move `<SliderControls />` from `FeaturedSlider` into the `Slide` component, positioned absolutely at the bottom center of the framed image container.

2. **Add a legibility scrim**  
   Place a subtle bottom-to-transparent gradient behind the controls so dots/arrows remain visible over light film stills.

3. **Preserve sizing and hit areas**  
   Keep the existing 44×44 arrow buttons and enlarged dot hit targets. Ensure the controls do not overlap important poster artwork (position at the bottom 12-16px of the frame).

4. **Adjust vertical spacing**  
   Reduce the gap between the framed image and the text column now that controls no longer sit between them. Keep the existing `mt-24 md:mt-32` hero top offset.

5. **Responsive behavior**  
   - Mobile (2:3 poster): controls sit at the bottom of the portrait frame.  
   - Desktop (16:9): controls sit at the bottom of the landscape frame.  
   - Controls remain centered horizontally on both.

6. **Verify no overlap with rails**  
   Because controls now live inside the hero section boundary, confirm they no longer collide with the "آثار تازه" rail below.

### Files to edit
- `src/components/featured-film.tsx`

### Out of scope
- No changes to autoplay timing, swipe logic, or film data.
- No changes to the admin dashboard or other routes.