## Problem
The "Terms of Service" link on `/membership` points to `/terms`, but no such route exists, so clicking it shows 404. The rest of the site opens Terms (and other legal pages) via an in-app overlay using `usePageOverlay().openPage("terms")` — see `src/components/site-footer.tsx`.

## Fix
Update `src/routes/membership.tsx` to use the same overlay pattern instead of a broken `<Link to="/terms">`:

1. Import `usePageOverlay` from `@/components/page-overlay`.
2. Get `openPage` inside the component.
3. Replace both `<Link to="/terms">…</Link>` (Persian and English) with a `<button type="button" onClick={() => openPage("terms")}>` styled identically (underline, hover color), so the Terms content opens in the existing sheet — consistent with the footer.

No new route, no design change, no other pages touched.