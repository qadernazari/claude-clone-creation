## Align form inputs with the Chiseled Editorial button system

The email/password inputs on `/auth` (and elsewhere) still use the old fully-rounded pill style, which clashes with the new 6px rectangular buttons. I'll bring inputs, textareas, and selects in line with the same design language.

### Changes

**1. `src/components/ui/input.tsx`**
- Radius: `rounded-md` (6px) — matches buttons
- Height: `h-11` on auth/large contexts, `h-10` default (consistent with button heights)
- Border: `border border-cream/20`, `hover:border-cream/40`, `focus:border-cream/60`
- Background: `bg-cream/5` (subtle fill, not transparent pill)
- Text: `text-cream`, placeholder `text-cream/40`
- Transition: `transition-all duration-200`
- Remove any `rounded-full` / `rounded-2xl` legacy classes

**2. `src/components/ui/textarea.tsx`** — same token set, `rounded-md`, matching borders/fill.

**3. `src/components/ui/select.tsx`** (trigger) — `rounded-md`, `h-10`, same border/fill treatment so selects sit next to buttons cleanly.

**4. `src/styles.css`**
- Extend the existing radius guard to cover inputs:
  ```css
  input[class*=rounded-], textarea[class*=rounded-], [role=combobox][class*=rounded-] {
    border-radius: 6px !important;
  }
  ```
- Keep the `.btn-seg-item` 4px override intact.

**5. Sweep inline overrides**
- `src/routes/auth.tsx`, `reset-password.tsx`, `film-checkout.tsx`, `membership-checkout.tsx`, `coupon-field.tsx`, `ir-pay-panel.tsx`, admin forms — strip any `rounded-full` / `rounded-2xl` / custom pill classes on inputs so the base component wins.

### Out of scope
- No business logic, validation, or layout changes
- Search input in header keeps its current icon-button treatment (already 6px)
- Checkboxes/radios untouched (different control class)

### Verification
- Screenshot `/auth` and a checkout form on mobile + desktop
- Confirm input height/radius visually matches sibling buttons (Sign in, Continue, etc.)
