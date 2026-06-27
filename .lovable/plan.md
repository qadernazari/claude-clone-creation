## Plan: Refine newsletter section design

The user selected the **Cinematic dark refined** direction for the newsletter email capture section. This stays close to the current dark, cinematic IRAN aesthetic while tightening the form into a more premium, weighted input/button pair.

### What will change

File: `src/components/newsletter-section.tsx`

1. **Input field**
   - Height: `h-11` → `h-14` (54 px, matches the selected direction)
   - Radius: `rounded-md` → `rounded-xl`
   - Background: `bg-bg-0` → `bg-bg-1` (darker, richer field surface)
   - Horizontal padding: `px-4` → `px-5`
   - Placeholder opacity: `text-cream/35` → `text-cream/40`
   - Focus ring: `focus:ring-amber/40` → `focus:ring-amber/25` for a subtler glow
   - Keep existing `focus:border-amber/50` and transition behavior

2. **Submit button**
   - Height: `h-11` → `h-14` to match the input
   - Radius: `rounded-md` → `rounded-xl`
   - Horizontal padding: `px-6` → `px-7`
   - Add soft depth: `shadow-lg shadow-amber/10`
   - Keep `bg-amber`, `text-ink`, `hover:bg-amber-bright`, `active:scale-[0.98]`, and `disabled:opacity-60`

3. **Layout**
   - Keep the existing `flex-col gap-3 sm:flex-row` form layout; the larger, rounder controls make the stacked mobile view feel more intentional.
   - Preserve Persian (Vazirmatn) text-align and font overrides for the `fa` locale.

### What will NOT change

- Copy/translations (`Stay in the loop`, `Notify Me`, etc.)
- Section heading, subtitle, and label
- Success/duplicate/error states
- Supabase insert logic and validation

### Verification

After implementation, open the homepage on a mobile viewport and confirm the newsletter input and button are the same height, share `rounded-xl`, and the button has the subtle amber shadow.