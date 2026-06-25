## Why the score is still 57

TBT is now green (you fixed that last round). The two red metrics are **LCP** and **FCP**, and they have a single root cause that the last round didn't address.

I fetched the live HTML of `https://www.ir.show/` and counted **5 image preloads** in `<head>`, not 2:

```
1. iran-logo.webp                                        (small, fine)
2. mobile cover (1200w q70)  — NO media query           ← duplicate
3. desktop thumbnail (1920w q72) — NO media query       ← duplicate, mobile downloads it too!
4. mobile cover     — media="(max-width: 767px)"        (the one we want on mobile)
5. desktop thumbnail — media="(min-width: 768px)"       (the one we want on desktop)
```

Preloads #2 and #3 are auto-emitted by **React 19** because `featured-film.tsx` renders BOTH a mobile `<img>` and a desktop `<img>` with `fetchPriority="high"`. React 19 hoists every `<img fetchPriority="high">` into an unconditional `ReactDOM.preload(...)` in `<head>` — it doesn't know about `md:hidden` / `hidden md:block`, so on a phone the browser **also downloads the 1920w landscape thumbnail** (~150–250 KB) at high priority, in parallel with the real LCP image. That competes for the same connection, pushes LCP from ~2s → 6.6s, and inflates FCP because the render-blocking CSS waits behind the same connection slot.

This is also why scores got worse the more "preload the LCP" work we did — every `fetchPriority="high"` we added doubled the problem instead of fixing it.

### Other smaller contributors to LCP

- The hero is served from `api.ir.show/storage/v1/render/image/...` (Supabase storage transform). First request is uncached → slow TTFB on PSI's cold lab run. Long-tail fix is to put a Caddy / CDN cache in front; not in scope for this round.
- The hero `<div>` also paints the same image as a CSS `background-image` (the `.hero-mobile-poster` layer) on top of the same `<img>`. The browser fetches once (same URL), but it does two paints and an extra composite. Removing the CSS background layer makes paint cheaper.

## Plan (frontend only, no behavior change)

1. **`src/components/featured-film.tsx` — stop React 19 from auto-preloading**
   - Remove `fetchPriority="high"` from every hero `<img>` (mobile portrait, desktop landscape, desktop portrait fallback). Keep `loading="eager"` and `decoding="async"`.
   - Drop the `.hero-mobile-poster` CSS background-image layer; the `<img>` underneath already shows the same picture. Saves a paint and one wasted style recalc.

2. **`src/routes/index.tsx` — keep the one correct preload per breakpoint**
   - Already correct (uses `media="(max-width: 767px)"` and `media="(min-width: 768px)"`). No change.
   - Add `imageSizes="100vw"` to the mobile preload so the browser knows it can use the same resource for the `<img sizes="100vw">` later (avoids a second fetch if browsers ever revalidate).

3. **`src/routes/films.$slug.tsx` — same fix on the film detail route**
   - That route's `<head>` preloads with `fetchpriority: "high"` (lowercase — TanStack accepts both), and the film page's hero `<img>` is also `fetchPriority="high"`. Same React-19 double-preload pattern. Remove `fetchPriority="high"` from the `<img>` on that page; keep the route-head preload.

4. **Verify after deploy**
   - Re-fetch the rendered HTML and confirm there are exactly **2 image preloads** for the hero (one per breakpoint), not 4.
   - Re-run mobile PageSpeed. Expected: LCP drops from 6.6s → ~2.5–3.5s, FCP from 3.9s → ~2s, Performance back into the 80s. TBT stays green.

### What this does NOT change

- No business logic, no auth, no API calls.
- No visual change — the hero looks identical; we're only stopping the browser from fetching the wrong image on the wrong device.
- Server-side caching of the Supabase storage transform (Caddy `Cache-Control`) is a separate, follow-up task — say the word after this lands and I'll write the Caddy snippet to put on the Hetzner mirror.

### Technical detail (for reference)

React 19's `react-dom/server` runs an internal `prepareHostDispatcher` that calls `ReactDOM.preload(src, { as: "image", fetchPriority })` whenever it serializes an `<img fetchPriority="high">`. Those preloads land in `<head>` regardless of CSS visibility, media queries, or `hidden` class, because the renderer can't evaluate CSS. The supported workaround is exactly what the plan does: don't mark both `<img>` tags as high-priority — let the route-level `<link rel="preload" media="...">` decide.
