# ir.show — Full Technical Context (paste to Claude)

Copy everything below the line into Claude. It's a self-contained brief of the project's stack, structure, backend, and current state.

---

## Project: ir.show

A premium streaming platform for Iranian cinema. Bilingual (English / Persian with full RTL). Live at **www.ir.show** (custom domain) via Lovable. Two regions: global (.com via Cloudflare Workers edge) and an Iran mirror (Hetzner + Caddy reverse proxy, no VPN required for Iranian users).

## Stack

- **Framework**: TanStack Start v1 (React 19, SSR/SSG, file-based routing)
- **Build**: Vite 7, deployed to Cloudflare Workers (`nodejs_compat`)
- **Styling**: Tailwind CSS v4 (configured via `src/styles.css` with `@theme`, no `tailwind.config.js`)
- **UI**: shadcn/ui components, Lucide icons, Sonner toasts
- **Data**: TanStack Query (loader-prefetch → `useSuspenseQuery` pattern)
- **i18n**: custom provider in `src/lib/i18n.tsx` (locales: `en`, `fa`), Vazirmatn font for Persian
- **Backend**: Lovable Cloud (Supabase under the hood — Postgres + Auth + Storage + RLS)
- **Payments**:
  - Stripe (live + sandbox keys configured) for global membership/PPV
  - Iranian PSP **not yet wired** (`src/lib/ir-payments.functions.ts` returns gateway-config error) — single launch blocker
- **Email**: Lovable Email (transactional + auth emails, React Email templates in `src/lib/email-templates/`)
- **AI**: Lovable AI Gateway (`LOVABLE_API_KEY` available, unused so far)
- **Package manager**: bun

## Repository layout

```
src/
  routes/                         # file-based routes (TanStack)
    __root.tsx                    # root shell, head/meta, fonts, NotFoundPage hookup
    index.tsx                     # home: FeaturedFilm hero + deferred rails + Newsletter + Footer
    browse.tsx                    # SSR'd browse grid (loader → useSuspenseQuery)
    films.$slug.tsx               # film detail, share button, watch/trailer CTAs
    membership.tsx                # plans + Stripe checkout entry
    auth.tsx                      # sign-in (Google OAuth via lovable broker + email)
    reset-password.tsx            # password reset (hash recovery flow)
    about.tsx, help.tsx, contact.tsx, privacy.tsx, terms.tsx   # bilingual content pages
    not-found.tsx                 # cinematic 404 (wired as router notFoundComponent)
    sitemap[.]xml.ts              # dynamic sitemap server route
    api/public/                   # public HTTP endpoints (webhooks, callbacks)
      payments/webhook.ts         # Stripe webhook
      ir-payments/callback.ts     # Iran PSP callback (placeholder)
      hooks/trial-reminders.ts    # cron: trial reminder emails
    lovable/email/                # Lovable Email auth + transactional hooks
    _authenticated/               # gated subtree (integration-managed gate)
      route.tsx                   # DO NOT EDIT — ssr:false + supabase.auth.getUser gate
      account.tsx, library.tsx, my-tickets.tsx, watch.$slug.tsx
      admin/                      # admin dashboard (role-gated AccessDenied UI)
        route.tsx, films.tsx, users.tsx, coupons.tsx, analytics.tsx, ...
  components/                     # site-header, site-footer, featured-film,
                                  # films-row, film-checkout, membership-checkout,
                                  # trial-banner, trial-expired-modal, auth-menu,
                                  # newsletter-section, iran-mirror-banner,
                                  # mobile-tab-bar, faq-section, etc.
  lib/
    home.functions.ts             # featured + rails server fns (with URL cache)
    browse.functions.ts / .server.ts
    related-films.functions.ts
    membership.functions.ts, trial.functions.ts, payments.functions.ts
    library.functions.ts, watch.functions.ts, reviews.functions.ts
    ir-payments.functions.ts      # NOT WIRED — needs Iranian gateway
    admin.functions.ts, admin-films.functions.ts
    coupons.functions.ts / .server.ts
    geo.functions.ts, region.functions.ts / .server.ts, member-geo.functions.ts
    og-image.functions.ts         # resized social preview URLs
    cache-headers.ts              # createIsomorphicFn cache-control helper
    storage-render.server.ts      # signed URL generator (TTL=1y, in-memory cache)
    stripe.ts / .server.ts / stripe-env.ts
    auth-context.tsx, i18n.tsx
    email-templates/              # React Email templates (trial-started, trial-day-5,
                                  # trial-ending-soon, payment-failed, subscription-canceled,
                                  # ticket-receipt, recovery, magic-link, signup, ...)
  integrations/
    supabase/
      client.ts                   # AUTO-GENERATED — never edit
      client.server.ts            # supabaseAdmin (service role) — server-only
      auth-middleware.ts          # requireSupabaseAuth for createServerFn
      auth-attacher.ts            # client middleware that attaches bearer token
      types.ts                    # AUTO-GENERATED DB types
    lovable/index.ts              # lovable.auth.signInWithOAuth (Google broker)
  hooks/                          # use-mobile, use-ir-mode, use-subscription, use-deferred-mount
  start.ts                        # registers attachSupabaseAuth functionMiddleware
  server.ts, router.tsx
  styles.css                      # Tailwind v4 + design tokens
  routeTree.gen.ts                # AUTO-GENERATED
supabase/
  config.toml                     # AUTO-GENERATED
public/robots.txt
```

## Design system

- **Theme**: dark cinematic. Cream text on near-black `bg-0`. Amber accent for CTAs and labels.
- **Tokens** (in `src/styles.css` via `@theme`): `--bg-0`, `--bg-1`, `--cream`, `--cream-bright`, `--ink`, `--amber`. Tailwind utilities use these (`bg-bg-0`, `text-cream`, `text-amber`).
- **Typography**: Apple-style display serif/sans pairing for English; **Vazirmatn** for Persian (loaded via `<link>` in `__root.tsx`, NOT @import).
- **Voice**: editorial, minimal, premium. Reject generic AI gradients/purple/Inter look.
- **RTL**: when `locale === "fa"`, use `dir="rtl"` and `font-vazir` utility.

## Persian (Farsi) copy rules — applied consistently across the app

- Membership = `عضویت` (not `اشتراک`)
- Free Trial = `آزمایش رایگان`
- "X days left" = `X روز مانده`
- "Payment failed" = `مشکل در پرداخت`
- Browse = `فیلم‌ها` (not `آثار`)
- "Continue watching" = `ادامه تماشا` (no ezafe)
- "Write a review" = `نقد بنویسید`
- Star aria-labels in Persian numerals: `۱ ستاره`...`۵ ستاره`
- Newsletter CTAs use polite plural imperatives (`در جریان بمانید`, `خبرم کنید`)
- Iran mirror banner: `نسخه اختصاصی ایران، بدون نیاز به فیلترشکن و سریع‌تر باز می‌شود.`

## Backend (Supabase / Lovable Cloud)

### Storage buckets (all private, signed URLs only)
- `film-covers`, `film-thumbnails`, `film-trailers`, `film-videos`

Signed URLs use TTL of 1 year and are cached per-worker in `GLOBAL_URL_CACHE` (in `src/lib/storage-render.server.ts` / `home.functions.ts`). Image transforms (`?width=…&quality=…`) must be baked into the signature server-side — appending client-side fails signature verification. Mobile cover served at width 760, quality 55.

### Key tables (see `src/integrations/supabase/types.ts`)
- `profiles` (auto-populated by `handle_new_user` trigger from `auth.users`)
- `films`, `film_credits`, `categories`, `episodes` (for series)
- `subscriptions` (Stripe-backed; `environment` = live/sandbox, `currency`)
- `trials` (7-day free trial)
- `tickets` (PPV purchases)
- `watchlist`, `watch_progress` (continue-watching)
- `reviews`
- `user_roles` (separate table, NOT on profile — uses `app_role` enum + `has_role` SECURITY DEFINER fn)
- `coupons`, `redemptions`
- `newsletter_subscribers` (public-insert with strict WITH CHECK: email regex + length + locale enum)

### RLS helpers (DB functions)
- `has_role(user_id, app_role)` — security definer, used in admin policies
- `has_active_subscription(user_id, env)` — checks active/trialing/past_due/canceled-but-not-expired
- `has_active_trial(user_id)` — 7-day window
- `has_membership_access(user_id, env)` — union of the above

### Auth
- Email/password + Google OAuth (via Lovable broker — `lovable.auth.signInWithOAuth("google")`).
- OAuth `redirect_uri` MUST be public same-origin (`window.location.origin`), not protected routes.
- Anonymous signups DISABLED. Email confirmation enabled.
- `_authenticated/route.tsx` is integration-managed (`ssr: false`, redirects to `/auth`). Do NOT author it or add extra `beforeLoad` gates.

### Secrets present
`LOVABLE_API_KEY`, `STRIPE_LIVE_API_KEY`, `STRIPE_SANDBOX_API_KEY`, `PAYMENTS_LIVE_WEBHOOK_SECRET`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `SUPABASE_*`, `GOOGLE_SEARCH_CONSOLE_API_KEY`.

## Server boundaries — CRITICAL

This is **TanStack Start**, not Next.js or Remix. Do NOT use Supabase Edge Functions for app-internal logic.

- **App-internal RPC**: `createServerFn` from `@tanstack/react-start`, in `src/lib/*.functions.ts` (client-safe path). Components import the function and call directly.
- **External callers (webhooks/cron/public APIs)**: server routes under `src/routes/api/public/*` using `createFileRoute(...).({ server: { handlers: { POST: ... }}})`. Verify signatures inside the handler.
- Three Supabase clients:
  1. Browser: `@/integrations/supabase/client` (publishable key, RLS as user, persists session)
  2. `requireSupabaseAuth` middleware (server-side as signed-in user via bearer token from client)
  3. `supabaseAdmin` from `@/integrations/supabase/client.server` (service role, bypasses RLS) — **load inside handler with `await import(...)`** in `.functions.ts` to avoid leaking into client bundle.
- `process.env.*` is server-only. Use `import.meta.env.VITE_*` in browser code.
- A `requireSupabaseAuth` server fn must NEVER be called from a public route loader — SSR prerender has no bearer token and the build will fail with 401.

## Performance / SSR work already done

- Browse page: loader returns data directly (not just `ensureQueryData`) → `useSuspenseQuery` with `initialData`. Server HTML contains real film cards, no "Loading…".
- Home: hero image preloaded in `head()` with mobile/desktop media-gated `<link rel="preload">`. Mobile cover at 760w/q55.
- Below-the-fold rails (`ContinueWatching`, `FilmsRow`) lazy-loaded and revealed on scroll.
- Critical CSS inlined in `__root.tsx`.
- Toaster lazy-loaded inside `DeferredChrome`.
- Cache headers on homepage: `s-maxage=120, stale-while-revalidate=600` (via `createIsomorphicFn` in `cache-headers.ts`).
- DNS-prefetch for Supabase domain in `__root.tsx`.
- Route-based code splitting via `@lovable.dev/vite-tanstack-config`.
- Signed-URL TTL = 1 year, in-memory cache per Worker.
- Current PageSpeed mobile ~85.

## Iran mirror (see `docs/iran-mirror.md` and `scripts/provision-iran-mirror.sh`)

- Hetzner VPS + Caddy reverse-proxies to the Lovable origin.
- `use-ir-mode` hook detects the mirror; `IranMirrorBanner` shows on .com to Iranian visitors.
- Region detection: `src/lib/region.functions.ts` + `member-geo.functions.ts`.
- Iran users can browse, sign up, start trial, watch — but **cannot pay** until an Iranian PSP (ZarinPal / IDPay / Shaparak) is wired into `ir-payments.functions.ts` and `/api/public/ir-payments/callback.ts`.

## Admin

- Roles via `public.user_roles` + `app_role` enum + `has_role` SECURITY DEFINER fn (never store roles on profile).
- `/admin` gate (`_authenticated/admin/route.tsx`) shows a custom `AccessDenied` view (user details + Copy-SQL grant button + Re-check) when role missing.
- Subroutes: films, users, coupons, trials, contributions, tickets, analytics, FAQ, banner, footer, homepage, menu, pages, settings, support, appearance, notify-list, categories.

## SEO / metadata

- Every shareable route has its own `head()` with unique title, description, og:title, og:description.
- `og:image` only on leaf routes (root would override). Browse + Membership fall back to a hardcoded image when loader data missing.
- Twitter description uses film synopsis on detail pages.
- FAQ schema (JSON-LD) on help page. Organization schema on home.
- Canonical links on bilingual pages.
- `robots.txt` disallows `/admin`, `/account`, `/auth`. Sitemap at `/sitemap.xml`.
- 404 page is `noindex`.

## Conventions / gotchas to remember when editing

1. **Never edit** `src/integrations/supabase/{client.ts, client.server.ts, auth-middleware.ts, auth-attacher.ts, types.ts}`, `src/routeTree.gen.ts`, `src/routes/_authenticated/route.tsx`, or `supabase/config.toml`. All auto-generated/integration-managed.
2. **Tailwind v4**: all theme config in `src/styles.css`, NOT a config file. Web fonts via `<link>` in `__root.tsx`, never `@import` in CSS.
3. **Color tokens**: never use raw `text-white`, `bg-black`, `#hex` — use semantic tokens (`text-cream`, `bg-bg-0`, `text-amber`).
4. **GRANTs required**: every `CREATE TABLE public.*` migration must include `GRANT` statements for `authenticated` / `service_role` (and `anon` only when explicit public read policy exists). RLS alone isn't enough — PostgREST blocks without grants.
5. **Server fn pattern**: `createServerFn({method:"POST"}).inputValidator(zodSchema).handler(async ({data, context}) => ...)`. Read `process.env.*` inside `.handler()`, not at module scope.
6. **`createServerFn` chain must stay continuous** — no `});` between `.inputValidator()` and `.handler()`.
7. **Public-route loaders cannot call protected server fns** (no bearer in SSR). Either make the fn public or move the route under `_authenticated/`.
8. **Cloudflare Workers runtime**: `nodejs_compat` enabled, but NO `child_process`, `sharp`, `canvas`, `puppeteer`, `fs.watch`. No native binaries.
9. **Asset images**: prefer Lovable Assets (`lovable-assets create --file ... > foo.asset.json`, then `import asset from "@/assets/foo.asset.json"` and use `asset.url`). Don't dump binaries in `public/` for app assets.
10. **i18n**: `useI18n()` returns `{locale, t, setLocale}`. Always provide both `en` and `fa` strings. Persian numerals via helper `num()`.

## Known launch blockers / TODOs

1. **Iran payments not wired** — `IrPayPanel` is dead end on the Iran mirror. ZarinPal sandbox recommended first.
2. **Stripe live webhook** — needs one real card test to confirm `subscriptions` row written with `environment='live'`.
3. **Auth redirect URLs in Supabase** — must include `https://www.ir.show`, `https://ir.show`, `/auth/callback`, `/reset-password` allowlist.
4. **Trial-expired UX on Iran mirror** — once payments wire, `TrialExpiredModal` must route Iranians to `IrPayPanel` not Stripe.
5. Email deliverability QA (Gmail + Iranian inboxes), large-video admin upload QA.

## Project URLs

- Preview: `https://id-preview--0b5dd7d0-84af-4920-8636-85ef6bd7b594.lovable.app`
- Production: `https://www.ir.show`
- Lovable project ID: `0b5dd7d0-84af-4920-8636-85ef6bd7b594`
