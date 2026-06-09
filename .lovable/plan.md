## What I found

Films, coupons, and global settings **already have Toman input fields**:

- `admin/films.tsx` → "Ticket — International (USD)" + "Ticket — تومان" inputs (`price_cents`, `price_toman`)
- `admin/coupons.tsx` → USD/Toman currency switch on fixed-amount discounts
- `admin/settings.tsx` → "Default ticket price — USD" + "Default ticket price — Toman"

The only missing piece is **membership pricing in Toman**. Today the monthly membership amount comes from Stripe (`MEMBERSHIP_PRICE_LOOKUP_KEY = "membership_monthly"`), so the IR flow (`<IrPayPanel kind="membership" …>`) sends no `amountToman` → the panel shows a blank price.

## Plan — add Toman membership price (one place, two file changes)

### 1. `src/routes/_authenticated/admin/settings.tsx`
Extend `GeneralSettings` defaults panel with a new field:

- `membershipPriceToman: number` (default `490000`)

Add a new Panel section "Membership pricing" (or append to the existing Defaults panel) with one input:

```
Monthly membership price — Toman   [____________]
Shown to visitors in Iran. International price is set in Stripe.
```

Persist via the same `general_settings` CMS key already in use.

### 2. `src/components/membership-checkout.tsx`
- Load the CMS `general_settings` value on mount (via `loadCmsKey`) and read `membershipPriceToman`.
- Pass it into the existing IR branch:
  ```
  <IrPayPanel kind="membership" itemId="monthly"
              amountToman={membershipPriceToman}
              couponCode={applied?.code} onClose={onClose} />
  ```

No DB migration needed — `site_content.general_settings` already stores the JSON blob.

### Out of scope (already done)
- Film Toman price input ✅ already in `admin/films.tsx`
- Coupon Toman amount ✅ already in `admin/coupons.tsx`
- Default ticket Toman price ✅ already in `admin/settings.tsx`
- Wiring ZarinPal — separate step, waiting on Hetzner setup.

## Technical notes
- `loadCmsKey<GeneralSettings>("general_settings")` is already the established read pattern (used by `GeneralPanel`).
- `IrPayPanel` already renders the formatted Toman amount when `amountToman` is provided — no changes needed there.
- Membership USD price stays in Stripe; we do **not** add a USD field here.
