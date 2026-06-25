## Goal
Remove redundant rows in the account dropdown / mobile sheet (`src/components/auth-menu.tsx`) so every entry leads to a distinct destination.

## Current duplication
- **Library section** — 3 rows all link to `/library`: My Library, Watchlist, Continue Watching.
- **Account section** — 2 rows both link to `/account`: Account Settings, Subscription & Billing.

## Changes (UI only, `src/components/auth-menu.tsx`)
1. **Library section** → keep a single row:
   - "My Library" → `/library` (icon: Library)
   - Remove Watchlist and Continue Watching rows.
2. **Account section** → collapse billing into settings:
   - "Account Settings" → `/account` (icon: UserIcon)
   - "My Tickets" → `/my-tickets` (kept, distinct page)
   - "Region" toggle (kept, distinct action)
   - Remove "Subscription & Billing" row (the Membership badge at the top already deep-links to `/account` for billing context).
3. Keep both Persian and English labels in sync (remove the corresponding `fa` strings too).
4. Admin and Session sections unchanged.

## Result
Menu shrinks from 8 navigation rows to 4 (My Library, Account Settings, My Tickets, Region) + Admin + Sign out, with no two rows pointing to the same page.

## Out of scope
- No route changes, no new pages, no tab/anchor deep-linking.
- No styling changes beyond removing the deleted rows.
