Redesign the featured-film hero in `src/components/featured-film.tsx` to fix the title/button overlap and move to a cleaner, more rectangular cinematic frame.

Goals
- Long Persian (or English) titles must never overlap the Watch Now button.
- Desktop frame should feel rectangular/cinematic (small radius, 21:9 letterbox).
- Mobile stays touch-friendly and keeps the current minimal text + centered button.
- Keep all accessibility: Persian/English aria-labels, focus-visible rings, keyboard activation.

Proposed layout

Desktop
- Frame: `aspect-[21/9]` with small rounded corners (`rounded-xl` / `rounded-2xl` max), thin `border-cream/10`, subtle shadow. Remove the large decorative corner brackets that fight the rectangular look, or replace them with a single thin amber rule if you still want an accent.
- Top-right: keep the "Original / Featured Film" badges.
- Bottom-left: keep the compact slider-control pill, but raise it slightly so it sits above the new bottom bar.
- Bottom bar: a full-width glass strip across the bottom of the frame.
  - Right side (RTL-aware): film title, `line-clamp-2` or `truncate`, constrained width so it never reaches the button.
  - Left side: amber "تماشا / Watch Now" button.
  - Built as a two-column grid with `min-w-0` on the title cell so long text truncates cleanly.

Mobile
- Keep the portrait frame (`aspect-[2/3]`) but reduce corner radius to match the new rectangular language.
- Keep the centered bottom pill button inside the frame.
- Hide the long title overlay inside the frame; rely on the rail cards and film page for the title, consistent with the previous mobile direction.

Implementation steps

1. Refactor `src/components/featured-film.tsx`
   - Replace the large `rounded-[1.75rem]` / `rounded-[2.5rem]` frame with `rounded-xl md:rounded-2xl` and `aspect-[2/3] md:aspect-[21/9]`.
   - Remove or simplify the corner-bracket accents.
   - Replace the absolute-positioned title block and centered button with a single glass bottom bar.
   - Use a responsive grid for the bottom bar:
     `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4` with RTL-safe margins.
   - Apply `line-clamp-2` to the title so it never grows into the button.
   - Keep the slider-control pill bottom-left, but add `bottom-20` (or equivalent) spacing above the bottom bar.
   - Preserve the existing `Link` + `useNavigate` keyboard behavior and dynamic `aria-label`.

2. Polish tokens
   - Use existing tokens: `bg-bg-0/60`, `border-cream/10`, `backdrop-blur-xl`, `text-cream-bright`, `text-amber`, etc.
   - No new color tokens needed unless we add a thin `border-amber/20` keyline; if so, add it to the existing semantic set in `src/styles.css`.

3. Verify
   - Run build and typecheck.
   - Capture desktop and mobile Playwright screenshots, including a slide with a long title, to confirm no overlap.
   - Test keyboard focus and click navigation on the Watch Now button.

Technical notes
- The title and button currently share the bottom edge of the frame with absolute positioning. The fix is to put them in the same flow container (the glass bottom bar) so the layout engine guarantees separation.
- `min-w-0` on the title cell is required so Persian text wraps/truncates instead of pushing the button out of the frame.
- The frame aspect ratio and border radius changes are purely presentational; no data or backend changes are needed.

````text
Desktop hero after change:
┌─────────────────────────────────────────────────────────────┐
│                                    [Original] [Featured]    │
│                                                             │
│                                                             │
│                       cover image                           │
│                                                             │
│                                                             │
│  [←  ●  ●  ●  →]                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  مسجد شیخ لطف‌الله و منارجنبان        [▶ تماشا]      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
````