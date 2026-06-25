## Dedicated `/membership` page with 4 plan tiers

A clean, premium comparison page for picking a plan and going straight to payment. Pre-paid bundles (no auto-renew) priced from a single base 1-month value with automatic discounts. Trial CTA shows only for users who haven't used it.

### Pricing model

Pre-paid bundles, one-time charges. Each plan grants N months of membership starting now (or extending current end date). Base values used as starting defaults — both are editable in Admin → Settings without code changes:

| Plan       | Discount | USD (base $9.99)  | Toman (base ۲۹۰٬۰۰۰) | Savings shown        |
| ---------- | -------- | ------------------ | --------------------- | -------------------- |
| 1 Month    | 0%       | $9.99              | ۲۹۰٬۰۰۰               | —                    |
| 3 Months   | 5%       | $28.47             | ۸۲۶٬۵۰۰               | "Save 5%"            |
| 6 Months   | 10%      | $53.95             | ۱٬۵۶۶٬۰۰۰             | "Save 10%"           |
| 12 Months  | 20%      | $95.90             | ۲٬۷۸۴٬۰۰۰             | "Best Value · -20%"  |

### New page: `src/routes/membership.tsx`

Public route (works signed-out — clicking a plan routes to `/auth?next=/membership` if needed). Layout:

- Hero header — title, subtitle ("One membership, all of IRAN's cinema."), and the 7-day-trial CTA card shown only when `!hasUsedTrial && !isMember`.
- 4 plan cards in a responsive grid (1 col mobile → 2 col tablet → 4 col desktop). Each card:
  - Duration label (e.g. "6 Months")
  - Big price + per-month equivalent ("$8.99/mo")
  - Savings badge (none / 5% / 10% / 20%)
  - "What's included" bullets (shared list rendered once per card via a compact `FeatureList` — unlimited streaming, no ads, HD, watch on any device, cancel/no renewal anytime)
  - "Best Value" ribbon on 12-month
  - One CTA button: "Choose plan"
- Below grid: small print — "One-time charge, no auto-renewal. Access ends at the end of your chosen period."
- FAQ accordion (4–5 short Q&As, EN+FA).

Persian (RTL) variant uses Vazir font and Toman amounts; layout flips automatically via existing `dir` setup.

### Checkout flow from the page

Clicking "Choose plan" opens the existing `MembershipCheckout` modal already in the repo, now passed a `plan` prop (`"1mo" | "3mo" | "6mo" | "12mo"`). The modal:

- **Stripe path (global)**: calls `createMembershipCheckout({ plan, … })` which resolves the matching lookup key (`membership_1mo` … `membership_12mo`) and creates a `mode: "payment"` Checkout Session. Embedded checkout renders inline.
- **Iran path**: renders `IrPayPanel` with `kind="membership"`, `itemId={plan}`, `amountToman` from CMS `general_settings.membershipPriceToman[plan]`.

### Redirect the existing "Become a member" entry points to `/membership`

Per the answer to question 3, all current modal-opening buttons become navigation:

- `src/components/membership-panel.tsx` — "Become a member" and "Skip trial, become a member" → `<Link to="/membership">`. Modal usage removed from this component.
- `src/routes/films.$slug.tsx` — film page "Become a member" → `<Link to="/membership">`.
- `src/components/trial-expired-modal.tsx` and `src/components/site-header.tsx` "Become a Member" → `<Link to="/membership">`.
- `AcceptTrialButton` stays as-is — trial is a separate action and the page surfaces it at the top.

The `MembershipCheckout` modal stays as a component but is now only opened from `/membership` (one source of truth for paid checkout).

### Stripe products + prices

Create 4 new prepaid products via `payments--batch_create_product` (one-time, no `recurring_interval`):

- `membership_1mo` — `Membership · 1 Month` — $9.99
- `membership_3mo` — `Membership · 3 Months` — $28.47
- `membership_6mo` — `Membership · 6 Months` — $53.95
- `membership_12mo` — `Membership · 12 Months` — $95.90

Tax code: `txcd_10000000` (general digital goods). The existing `membership_monthly` auto-renewing subscription is left in place for any historical subscribers but is no longer offered to new buyers.

### Iran pricing storage

Add 4 fields to CMS `general_settings`:
`membershipPriceToman_1mo`, `_3mo`, `_6mo`, `_12mo`. Defaults computed from existing single `membershipPriceToman` if present. Admin can override per plan in `/admin/settings`.

### Webhook updates (`src/routes/api/public/payments/webhook.ts`)

On successful one-time `checkout.session.completed` with `metadata.kind === "membership_bundle"`, extend the user's membership:

- Resolve the bundle months from `metadata.bundle_months` (1/3/6/12).
- Upsert into `subscriptions` table: set `status="active"`, `cancel_at_period_end=true`, `current_period_end = max(now, existing current_period_end) + N months`.
- Insert payment row with `price_id` and `plan` metadata for the admin dashboard.

This reuses the existing membership table without schema changes.

### Trial visibility rule

The 7-day-trial CTA card on `/membership` checks the live `useSubscription` hook:

```text
showTrial = !isLoading && !isMember && !hasUsedTrial
```

Hidden the moment a user starts or has consumed their trial. Same rule already used in `MembershipPanel`.

### Files touched

New:
- `src/routes/membership.tsx`
- `src/components/membership-plans-grid.tsx`
- `src/lib/membership-plans.ts` (single source of truth: ids, months, discount %, copy)

Modified:
- `src/lib/membership.functions.ts` — accept `plan` input; resolve correct lookup key; `mode: "payment"` for bundles; pass `bundle_months` in metadata.
- `src/components/membership-checkout.tsx` — accept `plan` prop, forward to server fn and `IrPayPanel`.
- `src/components/membership-panel.tsx`, `src/routes/films.$slug.tsx`, `src/components/trial-expired-modal.tsx`, `src/components/site-header.tsx` — replace modal triggers with `<Link to="/membership">`.
- `src/routes/api/public/payments/webhook.ts` — handle `kind: "membership_bundle"` to extend `current_period_end` by `bundle_months`.
- `src/routes/_authenticated/admin/settings.tsx` — 4 Toman price inputs.

### Verification

- Sign in, no trial used → `/membership` shows trial card + 4 plans.
- Click a plan (global) → embedded Stripe checkout opens, test card `4242 4242 4242 4242` completes, returns to `/checkout/return`, membership active for chosen months.
- Switch to ایران → same page, Toman prices, IR pay panel opens on "Choose plan".
- After trial accepted → trial card disappears, 4 plans still shown.
- Existing monthly subscribers → unchanged (portal still works).
