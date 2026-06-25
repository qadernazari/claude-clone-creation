## Problem

Footer links (About, Help, Contact, Privacy, Terms) open an in-app overlay (`PageSheet` in `src/components/page-overlay.tsx`), not a route. That overlay fetches CMS content via `useQuery`. While the query is in-flight, `pages` is `undefined`, so `entry` is `undefined` and the overlay renders the "Page not found / صفحه پیدا نشد" fallback for ~1 second until the CMS payload arrives. That's the "404 flash" — it's the overlay's not-found state, not a real router 404.

## Fix

Treat "no entry" as a real not-found only after the CMS query has settled, and show a quiet loading state until then.

Edit `src/components/page-overlay.tsx`, `PageSheet`:

1. Pull loading/fetched state from the pages query:
   - `const { data: pages, isLoading: pagesLoading, isFetched: pagesFetched } = useQuery({ ... CMS_KEYS.PAGES ... })`
   - Same for the FAQ query (`faqFetched`).

2. Replace the current branch
   ```tsx
   {!entry && slug !== "faq" && (
     <div className="p-16 text-center text-cream/50">Page not found</div>
   )}
   ```
   with:
   - While `pagesLoading || !pagesFetched` (and, for `slug === "faq"`, also FAQ not fetched): render a minimal skeleton (a couple of muted bars inside the same `px-6 py-14 md:px-12 md:py-20` article container) — no text, no "not found".
   - Only after the query has settled AND `!entry` AND `slug !== "faq"`: render the existing "Page not found" message.

3. Wrap the existing `(entry || slug === "faq")` article render so it only mounts once data is available — avoids a brief empty-article render between skeleton and content.

4. Optional polish (no behavior change): warm the cache by calling `loadCmsKey(CMS_KEYS.PAGES)` once in `PageOverlayProvider`'s mount effect via the existing query client, so subsequent overlay opens have data instantly. Use `queryClient.prefetchQuery` with the same `queryKey`/`queryFn` shape used in `PageSheet`.

No router changes, no footer changes, no new routes. Existing `/about.tsx` and `/contact.tsx` routes are unrelated to the footer overlay and remain untouched.

## Verification

- Open the site, hard-reload, click About in the footer → see a brief skeleton, then content. The "Page not found" text must never appear during a normal open.
- Click a truly unknown slug (e.g. via `#page=does-not-exist`) → after the query settles, the "Page not found" message still shows correctly.
- Same checks in Persian (`صفحه پیدا نشد` should not flash).
