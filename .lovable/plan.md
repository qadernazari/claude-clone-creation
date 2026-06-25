## Change
Hide the small Account icon button in the top header on mobile only. The bottom tab bar already exposes Account, so showing it twice is redundant.

## File
`src/components/site-header.tsx` — the `<Link to="/account">` icon button (around line 411).

Add `hidden md:inline-flex` to its className so it disappears on phones but remains on tablet/desktop where there is no bottom tab bar.

No other behavior changes.