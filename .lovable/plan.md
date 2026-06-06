## Goal

Drop the phone OTP path entirely and use email + password only on `/auth`. This removes the SMS provider dependency that was blocking sign-in.

## Changes

**`src/routes/auth.tsx`**
1. Remove the `Method` type, the `method` state, and the `email`/`phone` segmented toggle from the credentials step.
2. Remove all phone-related code paths: `phone`/`phoneError` state, `validatePhone`/`normalizePhone`, `sendPhoneOtp`, the phone branch in `handleCredentials`, and the phone branch in `handleVerify`.
3. Keep the email flow as-is:
   - Sign in: `signInWithPassword`. If `email not confirmed`, send a fresh email OTP and move to the verify step.
   - Sign up: `signUp` with `emailRedirectTo`, then verify step.
   - Verify step: 6-digit code via `verifyOtp({ type: "email" })`, with resend + cooldown.
4. Simplify copy that branched on `method` (verify title, "use a different email", etc.) so it always reads as email.
5. Drop the now-unused `phoneError`, phone helper text translations, and the phone error message for `signups not allowed`.

## Out of scope

- No design changes to the auth screen layout (header, logo, fonts, gradient stay the same).
- No changes to backend, RLS, or the `profiles` trigger.
- No changes to email templates — default Lovable confirmation emails continue to work.

## Verification

- Load `/auth`, confirm the phone toggle is gone and only the email + password form renders.
- Sign up with a new email → receive 6-digit code → verify → redirected home.
- Sign in with existing confirmed account → redirected home.
