## Problem

On the verify-email step, after the user types each digit the slot turns into a solid cream-colored pill with no digit visible. The digit IS in state (the code auto-submits at 6 chars), but it can't be seen because the filled-slot style is `bg-cream/[0.04]` + `text-cream`, and the near-transparent cream background is rendering as opaque cream — so cream-on-cream hides the digit.

## Fix

Edit only the filled-slot styles in `src/routes/auth.tsx` (the `OtpView` component, around lines 519–525):

- Filled slot: dark, slightly-lifted background + bright cream digit
  - `bg-cream/[0.04]` → `bg-white/5` (uses Tailwind's built-in white token, which reliably produces a faint translucent overlay on the dark page bg)
  - Keep `text-cream` so the digit stays high-contrast
  - Keep `border-cream/60`
- Empty slot: unchanged (`border-cream/12 text-cream/40`)
- Active ring: unchanged

Result: filled slots show a subtle lighter rounded rectangle with the typed digit clearly visible in cream, matching the original design intent.

## Out of scope

- No changes to OTP length (stays at 6), verify logic, resend flow, error handling, or the email template.
- No layout/spacing changes.
- No design-token edits in `src/styles.css`.

## Verification

- Open `/auth` on mobile, request a code, type digits — each slot should show the digit in cream over a faint dark background, and auto-submit on the 6th digit as before.
