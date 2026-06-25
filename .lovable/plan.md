## Diagnosis (from live HTML + PageSpeed trace)

PageSpeed is now CPU-clean (TBT 0 ms), so the score is bottlenecked by three network/render issues:

1. **Mobile is downloading TWO hero images instead of one.**
   The live HTML contains 4 hero `<link rel=preload as=image>` tags:
   - 2 correct ones with `media="(max-width:767px)"` / `media="(min-width:768px)"` (from `head()`).
   - 2 duplicates with **no `media`** that React 19 auto-emits for every `<img loading="eager">` on the page. That means a phone fetches the 1920-wide desktop thumbnail (~hundreds of KB) on top of the real mobile cover — pure LCP poison.

2. **LCP image is heavy.** Mobile cover is requested at `width=1200, quality=70`. On a 360-516 CSS-px phone that is ~2× too large.

3. **CLS 0.26 = Vazirmatn font swap.** Webfont is injected async (`media=print → all`). When the huge Persian `<h1>` swaps from the system fallback to Vazirmatn, the headline reflows. FCP 3.4 s is mostly the same story — font + image both racing on Slow 4G.

TBT is 0 ms and Best Practices/SEO/A11y are already green, so fixing only these three things lifts Performance into the 85-95 band.

## Changes

### 1. `src/components/featured-film.tsx` — stop the duplicate preload

- Set `loading="lazy"` on the **desktop** `<img>` and on the desktop blurred-background `<img>`. React 19 only auto-preloads `eager` images, so the desktop variant will no longer get hoisted into a `<link rel=preload>` on mobile. The correct, media-gated desktop preload in route `head()` still fires for real desktops.
- Keep `loading="eager"` only on the mobile `<img>` — the actual LCP element on phones.
- Add explicit `width`/`height` attrs on the hero `<img>`s (intrinsic ratio) so the browser reserves space the instant the preload lands; combined with the fixed `h-[82svh]` container this kills any image-driven shift.

### 2. `src/lib/home.functions.ts` (or wherever the signed cover URL is built) — shrink the mobile LCP

- Generate the mobile cover URL at `width=720, quality=65` (≈ half the bytes of the current 1200/70) and the desktop thumb at `width=1600, quality=70`. If the URL is signed for a specific transform, add a new signed variant for mobile rather than mutating the existing one.
- If the helper that signs these URLs lives elsewhere, I'll locate it during build and patch only the size/quality knobs — no schema changes.

### 3. `src/routes/__root.tsx` — kill the font-swap CLS

- Replace the async-stylesheet pattern with **two preloaded woff2 font files** for the headline weights that actually paint above the fold:
  - `Space Grotesk 500` (Latin display, English headline)
  - `Vazirmatn 500` (Arabic subset, Persian headline)
  Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for each, then keep the existing async Google Fonts CSS for the rest.
- Add a single `@font-face` for each preloaded file with `font-display: optional`. `optional` means: if the font isn't ready by first paint, the browser keeps the fallback and never swaps — zero CLS. The preload ensures it usually IS ready in time.
- Only inject the Vazirmatn preload when `locale === "fa"`, and only Space Grotesk when `locale === "en"`. Iran visitors stop paying for Latin display, global visitors stop paying for Arabic.

### 4. Drop the eager logo preload from the critical path

`SiteHeader` renders `<img>` for the logo eagerly, which React 19 hoists as the very first `<link rel=preload>`. Switch it to `loading="eager" fetchpriority="low"` so it still appears immediately but doesn't compete with the hero image for early bandwidth. (The logo is tiny; this only changes scheduling.)

## Verification

After deploy I'll:
- Re-curl `https://www.ir.show/` and confirm exactly **2** hero image preloads (one per media query) and no duplicate.
- Check the mobile cover URL resolves to the smaller transform.
- Re-run mobile PageSpeed and expect: LCP ≤ 2.8 s, FCP ≤ 2.0 s, CLS ≤ 0.05, Performance ≥ 88.

## Out of scope

No business logic, no backend, no design changes — purely loading-strategy and asset-size tweaks on the homepage critical path.
