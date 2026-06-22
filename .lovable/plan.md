# Iran-Region End-to-End Fix

## Root causes of "opens in English from Iran"

1. **The mirror hides the visitor's IP from Lovable.** Caddy on Hetzner proxies `ir.show` → Lovable. Lovable's edge sees Hetzner's German IP, so `cf-ipcountry` returns `DE`. Server-side IR detection always fails for mirror traffic.
2. **Locale is client-only.** `LocaleProvider` reads `localStorage` inside `useEffect`. SSR HTML is always `lang="en" dir="ltr"`. Even when client detection eventually flips to `fa`, the user sees a flash of English / LTR / Stripe.
3. **No cookie persistence.** `localStorage` can't be read server-side, so the SSR shell can never personalize on first visit.

## Strategy

Use the **mirror hostname itself** as the strongest, fastest, server-readable Iran signal — anyone reaching `ir.show` is overwhelmingly likely to be in Iran (the mirror exists for that). Combine with:

- A persistent cookie (`iran_region`) the server reads on every SSR render
- `cf-ipcountry` for visitors on the main Lovable URL or custom non-mirror domain
- A region-selector fallback when nothing is known

Render the first byte already in the correct locale, RTL, and currency — no client flip.

## Changes

### 1. Server: unified region resolver (`src/lib/region.server.ts` + `region.functions.ts`)
- Reads in priority order:
  1. `iran_region` cookie (explicit user choice — always wins)
  2. Host header — `ir.show`, `www.ir.show`, `m.ir.show` → `iran`
  3. `cf-ipcountry` / `x-forwarded-country` — `IR` → `iran`, any other known country → `global`
  4. `null` → "ask the user"
- Caddyfile already forwards `X-Forwarded-For`; add `X-Forwarded-Host` (already present) and pass real client country when available.

### 2. SSR hydration: inject region into root HTML
- In `src/routes/__root.tsx` `beforeLoad`/`loader`, call the region resolver and return `{ region, locale, dir }`.
- Set `<html lang dir data-region>` from the loader — no `useEffect` flip.
- Serialize the resolved value into a `<script>` tag (`window.__IRAN_REGION__`) so `LocaleProvider` initializes synchronously, no hydration mismatch.
- Set the `iran_region` cookie server-side when it was missing, so subsequent visits hit case (1).

### 3. `LocaleProvider` refactor
- Replace localStorage-on-mount with **SSR-provided initial value** read from `window.__IRAN_REGION__`.
- Remove `STORAGE_LANG` drift (region is the source of truth, locale derives from it).
- When the user manually changes region in the switcher, write the cookie via a tiny server fn so SSR honors it next time.
- Keep `localStorage` as a fallback only (e.g. running locally without SSR).

### 4. Caddy update (Hetzner mirror)
- Add `header_up X-Real-Country IR` on both `ir.show` and `api.ir.show` blocks — every request through the mirror is treated as IR unless the cookie says otherwise.
- Caddy still rewrites the Supabase host in the body (already in place).
- Reload script provided.

### 5. UI surface fixes
- **Payment panels:** `film-checkout.tsx`, `membership-checkout.tsx`, `ir-pay-panel.tsx` — gate Stripe vs IR-gateway purely on `region === "iran"` from context, not on hostname or `useIrMode`. Remove `useIrMode` reads or have it derive from `useLocale().region`.
- **Pricing format:** ensure Toman/IRR formatter is used everywhere region is Iran (audit `membership-panel`, film cards, checkout summaries).
- **Region switcher:** add a visible Globe/IR toggle in the header (already partial in `site-header`) and an explicit "Choose region" modal when resolver returns `null`.
- Remove the "Open Iran mirror" banner for visitors who are *already* on the mirror (already handled) and for visitors detected as global.

### 6. Iran performance pass
- **Fonts:** audit `__root.tsx` head — if Google Fonts is loaded via `fonts.googleapis.com`, self-host the Persian variant or use `bunny.net` (un-filtered in IR). Same for `fonts.gstatic.com`.
- **Images:** verify film poster CDN is the Supabase Storage host that we proxy via `api.ir.show`. If any `<img src>` uses a hardcoded `*.supabase.co` URL, route through the mirror.
- **Analytics / 3rd party:** audit `src/lib/analytics.functions.ts`, error reporter, any `gpteng.co` / `google-analytics.com` / `recaptcha` scripts — make them lazy or skip in IR.
- **Video / trailers:** check players don't point at YouTube/Vimeo.
- **Caddy:** enable HTTP/2 (default), confirm `encode zstd gzip`, raise `idle` timeout for slow IR mobile, add browser-cache headers for static Lovable assets.

### 7. Testing
- Add `?force_region=iran|global` query override for QA (dev/preview only).
- Document curl tests for both hostnames in `docs/iran-mirror.md`.
- Manual test checklist: cold load on `ir.show` (no cookie) → fa/RTL/Toman immediately, no flash; switch to global → cookie set, persists; visit Lovable URL directly from IR IP → still fa.

## Technical notes (for reviewer)

- `__root.tsx` loader runs during SSR on every match — cheap header read, no DB call.
- Cookie set via `setCookie('iran_region', value, { maxAge: 1y, path: '/', sameSite: 'lax' })` from `@tanstack/react-start/server`.
- `useIrMode` will become a thin wrapper around `useLocale().region === 'iran'` to avoid two sources of truth.
- The `IranMirrorBanner` keeps current behavior (only shows when on the main domain + detected as IR).

## Out of scope (call out, don't do)

- Replacing ipapi.co in `member-geo.functions.ts` (it's a member analytics enrichment, not the visitor-region path).
- Building a new payment integration — `ir-payments.functions.ts` stub stays as is.
- Translating any new copy strings — only wire existing FA strings to render correctly.

## Deliverables

1. `src/lib/region.server.ts`, `src/lib/region.functions.ts` (resolver + cookie writer)
2. `src/routes/__root.tsx` (loader + inline script for sync hydration)
3. `src/lib/i18n.tsx` (SSR-aware init, no useEffect flip)
4. `src/hooks/use-ir-mode.ts` (derive from context)
5. Caddyfile snippet update + `scripts/provision-iran-mirror.sh` patch
6. Audit + fix of payment / pricing / fonts / images per section 5–6
7. Updated `docs/iran-mirror.md` with the new mechanism