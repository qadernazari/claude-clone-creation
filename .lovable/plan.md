# IR Show — Honest Pre-Launch Review

## Short answer

**Almost — but not yet.** The platform is structurally complete: routing, auth, trials, memberships, PPV, watchlist, continue-watching, admin, RTL/Persian, Iran mirror, SSR performance work — all real and working. A real user can browse, sign up, start a trial, watch a film, and manage their account end-to-end on both regions.

But there is **one launch-blocker** (Iran payments) and a handful of polish items that, if shipped as-is, would create a visibly half-finished impression for the segment of users who matter most to you.

---

## 1. Launch blockers (must fix before going live)

### 1.1 Iran payments are not wired
`src/lib/ir-payments.functions.ts` + `IrPayPanel` currently return the gateway-config error. Visitors on the Iran mirror can browse, sign up, start the free trial, and watch trial-eligible content — but **they cannot pay for membership or PPV**. After 7 days every Iranian user hits a dead end.

Pick one and integrate before launch:
- ZarinPal (easiest, broad coverage)
- IDPay / NextPay (developer-friendly)
- Direct Shaparak PSP (if you already have a merchant)

Also wire the callback at `src/routes/api/public/ir-payments/callback.ts` to mark `tickets` / `subscriptions` paid with `environment='live'` and `currency='IRT'`.

### 1.2 Stripe live webhook + go-live confirmation
Confirm `PAYMENTS_LIVE_WEBHOOK_SECRET` is set (it is in secrets) **and** that a live test purchase actually writes a row to `subscriptions` with `environment='live'`. A silent webhook failure = paid users with no access. This must be verified with one real card before launch, not assumed.

### 1.3 Auth redirect URLs in Supabase
Add to allowed redirect URLs: `https://www.ir.show`, `https://ir.show`, `https://www.ir.show/auth/callback`, `https://www.ir.show/reset-password`. Without these, Google sign-in and password reset break on the production domain.

---

## 2. High-priority polish (ship within the first week)

- **Trial-expired UX on Iran mirror**: when payments are wired, make sure `TrialExpiredModal` routes Iran users to `IrPayPanel`, not Stripe.
- **`/reset-password` exists** — verify it handles the `type=recovery` hash and works end-to-end on both regions.
- **Search**: I see categories and browse, but no dedicated search route. For a film platform this is expected — even a simple title/people search box in the header would close a real gap.
- **Email deliverability**: trial reminders, receipts, password reset, magic links — confirm at least one of each actually arrives in Gmail + a typical Iranian inbox (Yahoo, local providers). Spam-folder = silent churn.
- **Mobile LCP on Iran mirror**: the mirror proxies through Hetzner, so add an HTTP cache header pass-through for `/_build/assets/*` and signed image URLs at the Caddy layer, or first paint over Iranian ISPs will feel slower than the .com.

---

## 3. Things that feel unfinished or confusing

- **"Library" vs "Watchlist" vs "My Tickets"** — three similar concepts in the account area. A first-time user won't know which is which. Recommend collapsing into one "Library" page with tabs: *Watchlist · Continue · Purchases*.
- **Membership page copy** — clear, but make the "7-day free trial" badge conditional (already done in code) and ensure the *post-trial* user sees "Continue your membership" instead of "Start free trial" everywhere, not just the hero.
- **Footer pages** (Terms, Privacy, Refund) — confirm none 404. Iran requires a refund/contact policy by law for online payments.
- **Admin film upload** — confirm large video uploads (1–3 GB) actually succeed through the current path. Storage limits and timeout behavior are the #1 thing that breaks for admins post-launch.

---

## 4. Nice-to-have (not blockers, but raise the "premium" feeling)

- Trailer autoplay (muted) on the hero after 2s idle — currently static image only.
- Subtitle track selection on `<video>` (Farsi + English) — essential for a Persian cinema platform.
- "Share" + deep link to a specific scene timestamp.
- Per-profile parental PIN already exists — surface a kid-safe browsing mode toggle in the header.
- Real OG images per film (the head() preloads cover, but verify Twitter/Telegram unfurl looks good — Telegram matters a lot in Iran).

---

## 5. Things to remove or simplify

- Two "Account" entry points on mobile were already collapsed — good. Re-audit the header on desktop for the same kind of duplication.
- Any leftover "Subscribe" CTAs from before the one-time bundle pivot. A grep for `subscription` in user-facing strings is worth doing.
- The mirror banner — confirm it's silent for users already on `ir.show` (no nag).

---

## 6. Final verdict

**Ready for a soft launch to friends-and-family today. Not ready for a public announcement until Iran payments are live and one real end-to-end paid purchase has been verified on each gateway (Stripe live + Iranian PSP).**

The foundation is genuinely strong — SSR, RTL, region routing, trials, RLS, admin. What's left is integration work and one round of "use it like a stranger" QA, not architectural rebuilding.

---

## Suggested next step

I can take this in one of three directions — tell me which:

1. **Wire an Iranian gateway** (recommend ZarinPal sandbox first) — this is the single biggest unlock.
2. **End-to-end QA pass with Playwright** from a clean browser: sign up → trial → watch → upgrade → cancel, on both regions, and file every real bug found.
3. **Add a search route + unify Library/Watchlist/Tickets** — the biggest UX clarity win.
