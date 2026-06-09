
# Iran Mirror — Plan

Two parts: (A) infrastructure you set up on Hetzner (I write the doc, you paste), and (B) code changes inside Lovable that make the app behave correctly when loaded through that proxy.

## A. Hetzner reverse proxy (you run, I document)

Goal: one VM in Falkenstein/Helsinki that fronts both the site and the Supabase API on Iran-friendly hostnames.

- **Domains** (configure DNS at your registrar)
  - `ir.show` → reverse-proxied site for IR visitors (or a sub like `m.ir.show` if you want to keep the main domain Cloudflare-only)
  - `api.ir.show` → reverse-proxied Supabase REST/Auth/Storage/Realtime
- **VM**: Hetzner CX22, Ubuntu 24.04 (~€4/mo)
- **Stack**: Caddy 2 (auto Let's Encrypt) — single config file, two upstreams
- **Deliverable from me**: `docs/iran-mirror.md` with:
  - Caddyfile (with WebSocket upgrade for Realtime, header rewrites for Supabase)
  - DNS record list
  - One-shot install script
  - Test checklist (use IPRoyal Iran proxy to verify)

## B. In-app changes (I build)

### 1. Region detection + routing
- Extend `detectVisitorRegion` already in `src/lib/geo.functions.ts` — on first visit from IR, show a one-time toast: *"Detected you're in Iran — switch to the Iran-optimized site? [Switch] [Stay]"* and persist choice in a cookie.
- When loaded from the mirror hostname, set a `ir_mode = true` flag in a React context.

### 2. Supabase client URL override
- Edit `src/integrations/supabase/client.ts` to read `VITE_SUPABASE_URL_OVERRIDE` **and** auto-detect: if `window.location.hostname` matches the mirror, use `https://api.ir.show` instead of `*.supabase.co`. Same publishable key works.
- Add `https://api.ir.show` to Supabase Auth → Redirect URLs (you click once in Cloud UI; I'll point you to it).

### 3. Toman pricing (manual per item)
Migration adds `price_irr_toman bigint` to:
- `films` (PPV ticket price in Toman)
- `plans` / membership tiers → currently membership is in `subscriptions`; I'll check whether prices live on a `plans` table or in code, and add IRR there
- `coupons` (fixed-amount IRR discounts)
- `contributions` (suggested IRR amounts)

Admin UI: every existing price field gets a second IRR input next to it. Admin can leave IRR blank → item is hidden from IR users.

### 4. IR payment gateway (stub now, fill in later)
- New file `src/lib/ir-payments.functions.ts` with the same shape as the Stripe checkout fns: `createIrCheckout({ kind: 'membership'|'ticket'|'contribution', itemId, couponCode? })` returns `{ redirectUrl }`.
- New server route `src/routes/api/public/ir-payments/callback.ts` that the gateway calls after payment, marks the ticket/subscription paid, and redirects the user back.
- Today both functions return `{ error: 'IR gateway not yet configured' }` and the IR checkout button shows "Coming soon" — wired end-to-end, gateway swap is one file.
- Tables already in place (`tickets`, `subscriptions`, `payment_events`) get a `provider` column with values `stripe | zarinpal | idpay | nextpay | manual` so IR transactions are clearly separated.

### 5. IR-only checkout UI
- When `ir_mode === true`:
  - Hide Stripe/PayPal buttons everywhere
  - Show "Pay with Iranian bank card" button → calls `createIrCheckout`
  - Display prices in **Toman** (formatted with Persian digits if locale is `fa`)
- When `ir_mode === false`: zero visual change, current flow stays identical.

### 6. Sign-in: magic link + SMS OTP (both)
- Magic link: already supported by Supabase, just expose it on `/auth` for IR users (no Google button in IR mode — Google is blocked anyway).
- Phone OTP: requires picking an Iranian SMS provider with a Supabase-compatible SMS hook (Kavenegar is the common one). For now I'll:
  - Enable phone auth in Supabase config
  - Build the UI (phone field + "Send code" + 6-digit input)
  - Wire `signInWithOtp({ phone })` and `verifyOtp`
  - Add a clear note in `docs/iran-mirror.md` listing the 2–3 SMS providers and the one-time Supabase Auth → SMS Provider config step you do in the Cloud UI when you sign up with one
- Same `auth.users` row for both methods, so an IR user with both a phone and an email lands in one account with one watchlist/library.

### 7. Hide blocked third-parties in IR mode
- Skip Google Fonts (already self-hostable via the existing build; I'll fall back to system stack for IR)
- Skip reCAPTCHA if present
- Skip any analytics that hit blocked hosts

## What's out of scope (intentionally)
- Auto-converting USD↔Toman prices (you chose manual)
- Picking the Iran gateway now (stub today, swap later — 1 file)
- Moving database geography (DB stays on Supabase EU; only the *edge* is proxied)
- Stripe/PayPal changes — they continue to work unchanged for non-IR visitors

## Order of work
1. DB migration: add `price_irr_toman`, `provider` columns, phone-auth schema bits
2. Region detection + `ir_mode` context + Supabase URL override
3. Admin: add IRR fields to films/plans/coupons/contributions editors
4. IR checkout UI + stubbed `ir-payments` functions + callback route
5. Magic link + phone OTP on `/auth`, IR-aware sign-in screen
6. Write `docs/iran-mirror.md` (Caddyfile, DNS, SMS provider setup, gateway swap guide)
7. You: spin up Hetzner VM, paste Caddyfile, point DNS, verify via IPRoyal

## Technical notes (for me, not required reading)
- Caddy will proxy `api.ir.show` → `yasfnvftzwyuxdhpysof.supabase.co` with `Host` header rewrite so Supabase's edge accepts the request. Realtime needs `header_up Connection {>Connection}` + `header_up Upgrade {>Upgrade}`.
- The site is on Cloudflare Workers (`*.lovable.app`), which IR blocks. Caddy proxies `ir.show` → the published Lovable URL; Cloudflare sees Hetzner's German IP, not the Iranian visitor, so it serves normally.
- `VITE_SUPABASE_URL_OVERRIDE` must NOT replace `VITE_SUPABASE_URL` — the override is opt-in per request based on hostname so non-IR visitors keep going direct.
- `provider` column on `tickets`/`subscriptions` is needed because Stripe webhook IDs and ZarinPal `Authority` strings can collide on simple `external_id` matching.
