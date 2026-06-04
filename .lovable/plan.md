# Launch Sweep Plan

I'll execute this in 4 phases across separate turns so each turn stays stable and reviewable. After each phase you can test, then say "continue" for the next.

## Phase 1 — User Library & Watch (this turn)
The biggest user-facing gap today. After this, members and PPV buyers have a real "home" inside the product.

- **My Library** route (`/library`) replacing/extending `My Tickets` with tabs:
  - Continue Watching (resume from last position)
  - Watchlist / Favorites
  - Purchased (active PPV tickets)
  - Membership catalog shortcut
  - Watch history
  - Expired tickets
- DB additions: `watch_progress`, `watchlist` tables with RLS + GRANTs
- Server fns: `getLibrary`, `toggleWatchlist`, `upsertWatchProgress`
- Hook watch page to write progress every ~10s
- Add "Add to Watchlist" + "Continue Watching" badges on film cards/detail

## Phase 2 — Video Player & Film Detail polish
- Custom controls overlay (play/pause, scrub, volume, fullscreen, subtitles, speed, quality if HLS)
- Resume-from-position dialog
- Subtitle track switching (uses existing `subtitles` field)
- Mobile gestures, keyboard shortcuts, error/loading states
- Film detail: clearer access badge (Included / Premium / PPV / Free), trailer modal, cast & crew section, "More like this" rail

## Phase 3 — Admin Dashboard depth
- Overview KPIs (MRR, active subs, trials, churn, PPV sales, refunds, failed payments) backed by real queries
- Film access controls (membership inclusion toggle, PPV price USD/IRR, region, age rating, scheduled publish)
- Coupons / promo codes table + Stripe coupon sync
- Analytics (watch time, top films, search terms, country/device)
- Activity log table
- Admin roles already exist; add audit trail

## Phase 4 — Trust, Email, Legal, Edge cases
- Legal pages (Terms, Privacy, Cookies, Refund, DMCA, Copyright, Filmmaker terms) editable via existing CMS
- Email templates: trial-started, trial-ending, payment-failed, subscription-cancelled, premium-purchase, refund, welcome
- Trial countdown + cancel/refund flows in account
- Empty / error / loading state pass across the app
- RTL Persian audit
- Security scan + linter fixes before publish

## What this turn ships
Just Phase 1 (Library + watch progress + watchlist). I will:
1. Create migration for `watch_progress` + `watchlist`
2. Add server fns and hook
3. Build `/library` route with tabbed UI
4. Wire watch page to record progress
5. Add Watchlist/Continue Watching surfaces on home + film detail

Reply **continue** after testing to move to Phase 2.