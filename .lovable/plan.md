## Goal
Roll out the Chiseled Editorial button system as the single source of truth for every button across ir.show.

## Design tokens (from the picked direction)
- **Radius**: 6px on all buttons; 4px on segmented items inside a 6px container
- **Heights**: `h-10` standard, `h-8` compact (inline contexts), `h-11` only for primary hero CTAs
- **Primary**: `bg-cream text-ink font-bold` + `hover:bg-white` + `active:scale-95`
- **Secondary/Ghost**: `border border-cream/20 text-cream font-medium` + `hover:bg-cream/5 hover:border-cream/40`
- **Destructive**: `bg-red-500/10 border border-red-500/30 text-red-500` + `hover:bg-red-500/20`
- **Amber accent (e.g. Premium/Watch)**: `border border-amber/30 text-amber` + `hover:bg-amber/10` (filled amber kept only for hero "Accept Trial")
- **Icon button**: `w-10 h-10` square, bordered variant + subtle-fill variant, 6px radius
- **Segmented toggle**: outer `p-1 bg-black/40 border border-cream/10 rounded-md`, inner active `bg-cream text-ink rounded-[4px]`, inactive `text-cream/50 hover:text-cream`
- **Transitions**: `transition-all duration-200`, `active:scale-95` on interactive buttons

## Implementation steps

1. **Centralize the system in `src/components/ui/button.tsx`**
   Replace shadcn `buttonVariants` with the chiseled spec:
   - `variant`: `primary` (cream/ink), `secondary` (bordered ghost), `destructive` (red tinted), `amber` (amber outline), `ghost` (transparent), `link`
   - `size`: `sm` (h-8 px-4 text-xs), `default` (h-10 px-6 text-sm), `lg` (h-11 px-8 text-sm), `icon` (w-10 h-10)
   - All variants: `rounded-md font-medium active:scale-95 transition-all duration-200`
   - Primary uses `font-bold`

2. **Update the global CSS guard in `src/styles.css`**
   The current `!important` rule forces every `rounded-*` button to 6px. Keep that, and also pin segmented-inner pills to 4px via a small utility class (`btn-seg-item`) so nested toggles match the prototype.

3. **Refit header components to match exactly**
   - `src/components/site-header.tsx` — `RegionToggle` desktop segmented control: outer `p-1 bg-black/40 border border-cream/10 rounded-md`; items `rounded-[4px] h-8 px-4`. Search icon button → `w-10 h-10` bordered variant. `MembershipCta` → `h-10 px-6` cream primary.
   - `src/components/auth-menu.tsx` — Sign In becomes bordered secondary `h-10 px-6`.
   - `src/components/accept-trial-button.tsx` — default class becomes the cream primary at `h-10 px-6` (or `h-11 px-8` when `fullWidth` for hero contexts).

4. **Sweep remaining inline button classes**
   For files where buttons use ad-hoc Tailwind (not the shared `Button` component), normalize to the new spec. Targets already touched in prior passes:
   - `src/components/film-checkout.tsx`, `membership-checkout.tsx`, `trial-expired-modal.tsx`, `films-row.tsx`, `page-overlay.tsx`, `watchlist-button.tsx`
   - `src/routes/films.$slug.tsx`, `auth.tsx`, `browse.tsx`, `index.tsx`, `_authenticated/watch.$slug.tsx`, `_authenticated/library.tsx`, `_authenticated/account.tsx`, `reset-password.tsx`
   - Admin routes under `src/routes/_authenticated/admin/*`
   Rules applied: convert pill/oversized paddings to `h-10 px-6` (or `h-8 px-4` if inline), drop gradient/glow backgrounds in favor of cream primary or bordered secondary, keep amber **outline** for premium accents, switch destructive buttons to the red-tinted bordered style.

5. **Mobile parity check**
   - Mobile region trigger and bottom sheet buttons in `site-header.tsx` already use `rounded-md` — re-verify heights match `h-10` and the active region card uses the cream/ink primary treatment.
   - `mobile-tab-bar.tsx` icon buttons → ensure `w-10 h-10` icon variant.

6. **Verify visually**
   - Run the dev preview on desktop and mobile viewports.
   - Capture: header (search + region toggle + Free Trial + Sign In), film page CTAs (Watch / Trailer / Watchlist / Share), auth page submit + Google, account page (destructive Cancel), admin table actions.
   - Confirm: all radii = 6px (4px inside segmented), all heights consistent, no leftover `rounded-full`/`rounded-2xl` on buttons, no gradient/glow primary, hover and `active:scale-95` feel consistent.

## Technical notes
- Tailwind v4: no config file; semantic tokens (`cream`, `ink`, `amber`, `bg-0`) come from `@theme` in `src/styles.css` — no hex literals in components.
- The global `!important` radius guard in `src/styles.css` stays as a safety net for any third-party or missed buttons.
- No business-logic changes. RTL/Persian flows and i18n labels remain untouched.

## Out of scope
- Form inputs, selects, badges, chips — only buttons / icon buttons / segmented toggles.
- Color palette changes beyond what's already in the design tokens.
