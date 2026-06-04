# Apple TV+ direction — implementation plan

Three workstreams. I'll ship them in order so each builds on the last.

---

## 1. Typography & design tokens (foundation)

- Swap fonts in `src/styles.css`:
  - `--font-display` → **Sora** (was Archivo Black)
  - `--font-body` → **Manrope** (was Hind)
  - `--font-fa` → **Vazirmatn** (unchanged, kept for FA)
- Add Google Fonts links in `src/routes/__root.tsx` head.
- Reduce display weight from 900-black → 600/500. Apple TV+ uses medium weights with tight tracking, not heavy display.
- Tighten letter-spacing on H1/H2 to `-0.03em`.
- Add new spacing scale tokens for "cinematic" breathing room (section padding `py-24 md:py-32`).
- Soften the gold accent — use it sparingly (links, focus rings only), not on CTAs.

## 2. Homepage + film detail redesign (Apple TV+ inspiration)

**Homepage (`src/routes/index.tsx`)**
- Full-bleed hero: featured film with cinematic backdrop, gradient fade to bg, large quiet title + 1-line synopsis + "Watch Now" / "More Info" buttons. No price.
- Edge-to-edge horizontal scroll rows (`films-row`) with larger 16:9 posters, generous gaps, snap scrolling, fade-edges.
- Section titles in display font, small, all sentence case (not uppercase tracking).
- Remove pricing badges from cards entirely — replaced by "Included" / "Premium" pill.
- Smooth in-view fade-up via existing `.fade-up` keyframe + IntersectionObserver.
- Bigger whitespace between rows (96px+).
- FAQ section: keep but lighten; reposition lower.

**Film detail (`src/routes/films.$slug.tsx`)**
- Hero: full-width backdrop with bottom gradient. Title + meta + primary CTA float over it.
- CTA logic:
  - Member + film is `membership`/`membership_or_ppv`/`free` → **Watch Now**
  - Non-member + film is `membership_or_ppv` → **Start Free Trial** primary, "Or buy this film" secondary
  - Any user + film is `ppv_only` → **Buy** (no membership upsell on this film)
  - Premium films show a "Premium Release" pill above title
- Synopsis, credits, related films below, generously spaced.

## 3. Hybrid monetization: Membership + PPV

**Schema changes** (`films` table + new `subscriptions` table)
- Add `films.access_type` enum: `membership`, `ppv_only`, `membership_or_ppv`, `free`. Default `membership`.
- Add `films.is_premium` boolean (visual flag for badge). Default `false`.
- New `subscriptions` table per `stripe-subscriptions` knowledge: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `price_id`, `current_period_end`, `cancel_at_period_end`, `trial_end`, `environment`, RLS scoped to user.
- New `has_active_subscription(user_id, env)` SQL function (security definer) for server-side gating.
- RLS + GRANTs per knowledge.

**Stripe**
- Create membership product via `payments--create_product`:
  - `iran_membership` product, `membership_monthly` price, **$9.99/mo**, 7-day free trial configured at checkout (`subscription_data.trial_period_days: 7`).
  - Tax code: `txcd_10000000` (general digital goods).
- Reuse existing per-film Stripe products for PPV.
- New `createMembershipCheckout` server fn (subscription mode, embedded).
- Extend existing webhook (`routes/api/public/payments/webhook.ts`) to handle `customer.subscription.created/updated/deleted` and `invoice.paid/payment_failed` → upsert into `subscriptions`.

**Access logic**
- New `useSubscription()` hook + `canWatch(film, subscription)` helper.
- `watch.functions.ts`: server-side check — allow if film is `free`, or user has active sub and film allows membership, or user has valid PPV ticket.
- Film card / detail CTAs branch on `canWatch`.

**Admin** (`_authenticated/admin/films.tsx`)
- Add **Access Type** select per film (4 options).
- Add **Premium** toggle.

**UX cleanup**
- Remove price text from film cards (replaced with access pill).
- Homepage gets a single "Start free trial" CTA in nav for non-members; hidden for members.
- Footer: add Membership link.
- Keep PPV checkout flow intact for `ppv_only` and as fallback.

---

## Technical notes

- All Stripe code goes through `createStripeClient(env)` + `getStripeErrorMessage` per `stripe-shared-utility`.
- Webhook signature verification stays as-is; add subscription event branches.
- Migration includes `GRANT`s for new `subscriptions` table.
- Realtime: subscribe to `subscriptions` table for current user, refetch on change.
- I will NOT touch admin polish, account page, auth pages, or browse page in this pass (per your "Homepage + film detail only" answer).
- I will NOT migrate existing tickets — past purchases keep working as PPV unlocks.

## Out of scope (this pass)

- Browse page, about, contact, account, admin visual polish.
- Yearly plan, family plan, gift subscriptions.
- Existing-subscription portal page (we'll wire the Stripe Billing Portal link in account, but no custom UI).
- Trial countdown banners (can add later if you want).

---

Approve and I'll start with workstream 1 (typography), then 2 (visual redesign), then 3 (monetization). The monetization piece is the largest chunk — most of the credit spend lands there.