## Goal

Make the sign-in / create-account flow feel like a modern streaming app — clear states, smooth transitions, and a premium success screen instead of the tiny "Check your inbox" text.

## Scope

Only `src/routes/auth.tsx` (frontend). No auth logic, schema, or provider changes.

## Changes

### 1. Replace inline `info` text with a full success state
After a successful `signUp` or `resetPasswordForEmail`, swap the form area for a dedicated success view (same page, animated transition — no route change, no modal needed because the auth page already owns the viewport).

Success view contents:
- Animated email/check icon (amber glow, scale+fade in)
- Headline: "Check your inbox"
- Subline: "We've sent a secure link to **{email}**. This window will update automatically once you're signed in."
- Buttons:
  - **Open email app** (mobile only, ≤md): deep link to `mailto:` and common providers (Gmail / Apple Mail) detected from the email domain; falls back to `mailto:`
  - **Resend email** (30s cooldown with countdown)
  - **Use a different email** (returns to the form, preserves mode)
- Subtle "Waiting for confirmation…" pulsing indicator (since `onAuthStateChange` already auto-redirects on confirm)

Reuse for both signup confirmation and password-reset confirmation (different copy).

### 2. Smoother transitions between modes
- Wrap the heading + form block in a keyed container so switching signin ↔ signup ↔ forgot ↔ success cross-fades (existing `animate-fade-in` + a short translate-y).
- Tab switch (Sign in / Create account): animate the active pill with a sliding background instead of instant swap.

### 3. Better loading states
- Primary button: replace bare spinner with spinner + label ("Signing you in…", "Creating your account…", "Sending link…") so the button doesn't look frozen.
- OAuth buttons: dim the non-active provider while one is loading (already partially done) and add a subtle shimmer on the active one.
- Disable form inputs (not just buttons) during submit to prevent edits mid-request.

### 4. Inline field validation + friendlier errors
- Email field: validate format on blur, show inline hint instead of waiting for server error.
- Map common Supabase errors to human copy ("Invalid login credentials" → "That email and password don't match.", "User already registered" → "An account with this email exists — try signing in.").
- Error banner: add an icon and a slide-down animation instead of appearing abruptly.

### 5. Mobile polish
- Success screen uses the full safe-area height with the action buttons pinned near the bottom for thumb reach.
- Add `enterkeyhint="next" / "done"` and proper `autoComplete` (already mostly there) so iOS keyboard flows naturally between fields.
- Slightly larger tap targets on the resend/change-email buttons (h-12, full width on mobile).

### 6. Bilingual (fa/en)
All new copy added to the existing `t` object with Farsi translations; RTL respected (icons, button order, animations mirrored where needed).

## Out of scope

- No changes to Supabase auth config, magic-link vs password mode, OAuth providers, or routes.
- No new dependencies. Animations use Tailwind + existing keyframes in `styles.css` (add 1–2 keyframes if needed).
- No changes to the reset-password landing page (separate route).

## Files touched

- `src/routes/auth.tsx` (main work)
- `src/styles.css` (only if a new keyframe like `success-pop` is needed)