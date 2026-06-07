# Critical audit: what to cut, what to hide, what to redesign

Reviewed the full route tree (`src/routes/`), the 22-page admin (`src/routes/_authenticated/admin/`), and the public component set (`src/components/`). Scored everything against your four jobs: **discover, watch, support filmmakers, manage content**. If something doesn't serve one of those, it's flagged.

I'm being blunt on purpose. Nothing here is destructive yet — pick items and I'll cut them.

---

## A. The home page is doing too much

`src/routes/index.tsx` renders, in order:
1. Featured hero
2. Continue Watching
3. `FilmsRow` (Originals + New Releases + up to 4 category rails = **up to 6 rails**)
4. `CollectionsGrid` (up to 6 category tiles)
5. Membership upsell block
6. FAQ section
7. Footer

Apple TV+ shows **hero + 4–5 rails**. MUBI shows **hero + 1 rail + editorial**. Netflix shows **hero + rails**. None of them ship an FAQ on the homepage.

**Recommended cuts on `/`:**
- **Remove `CollectionsGrid` from home.** It's redundant with the category rails already shown by `FilmsRow` directly above it. Same data, second presentation. Keep collections only on `/browse` or kill the component entirely.
- **Remove `FaqSection` from home.** FAQ belongs on `/help` or `/about`. Apple TV+ / MUBI / Netflix home pages do not have FAQs. It's SEO bait at the cost of feeling like a marketing site.
- **Cap rails at 4 on home.** Originals, New Releases, 2 category rails max. More rails = more scroll fatigue, slower LCP, more thumbnails to download on mobile.
- **Remove `MembershipMoment` block** for signed-out users in favor of a single bottom CTA in the footer; the hero CTA already converts. Two upsells on one page is pressure, not premium.

## B. Pages that don't earn their slot

- **`/press`** — a press page for a streaming service with no press coverage yet is aspirational. Either remove until there's real press, or fold into `/about`.
- **`/contact`** — keep, but the form + submissions admin page is a lot. MUBI uses a single `support@` email. Recommend replacing with a `mailto:` link inside `/about` and deleting `contact-submissions.tsx` admin page.
- **`/about`** and **`/press`** overlap; merge.
- **`/unsubscribe`** — required, leave alone.
- **`checkout.return.tsx`** — required, leave alone.

## C. Components that add weight without value

- **`welcome-splash.tsx`** — region/language splash modal. Premium services detect region silently. This is the #1 friction on first visit. Move to a quiet language switch in the header; auto-detect locale from `navigator.language`. Delete the splash.
- **`promo-banner.tsx` + `trial-banner.tsx` + `payment-test-mode-banner.tsx`** — three stacked top banners. At most one banner should ever show. Consolidate into a single banner slot with priority (test-mode > trial state > marketing promo).
- **`trial-expired-modal.tsx`** — modals interrupt. Replace with an inline state on the watch/film page ("Your trial ended — continue with membership"). Modals on premium services are rare and always feel cheap.
- **`contribute-modal.tsx`** — if "support filmmakers" is a real pillar, contribution shouldn't be hidden in a modal. Promote to a real page (`/support-filmmakers`) or remove. As-is, it's a half-feature.
- **`page-overlay.tsx`** — verify it's actually used; if it's only for the welcome splash, deletes with it.
- **`coupon-field.tsx`** appearing inside both `film-checkout` and `membership-checkout` — keep, but render collapsed behind a "Have a code?" link. Default-visible coupon fields scream discount site.

## D. Admin: 22 pages is too many

A premium catalog of this size (dozens of films, not thousands) needs **≈8 admin pages**, not 22. Consolidation recommendations:

**Merge into one "Site content" page:**
- `appearance.tsx` + `homepage.tsx` + `footer.tsx` + `menu.tsx` + `banner.tsx` + `pages.tsx` + `faq.tsx` → single page with tabs. These are all "edit the marketing surface."

**Merge into one "Commerce" page:**
- `coupons.tsx` + `tickets.tsx` + `trials.tsx` + `contributions.tsx` → tabs under one "Commerce" page. They're all transactional history with the same shape.

**Merge or remove:**
- `contact-submissions.tsx` → remove with the contact form (see B).
- `notify-list.tsx` → if this is a "notify me when X launches" list and you have no scheduled launches, hide it. Otherwise fold into Commerce.
- `support.tsx` → if it duplicates contact-submissions, pick one.
- `categories.tsx` → keep but move under `films.tsx` as a tab; categories only exist to organize films.

**Per-film analytics + credits as nested tabs (already are):** good, leave them.

**End state — 8 admin pages:**
1. Films (with Categories tab + per-film Analytics & Credits)
2. Users
3. Commerce (Tickets / Trials / Coupons / Contributions)
4. Site content (Homepage / Pages / FAQ / Menu / Footer / Banner / Appearance)
5. Analytics (site-wide)
6. Settings
7. Support inbox (only if you keep a contact form)
8. Admin home/index

That's 14 fewer pages.

## E. Settings that should be hidden behind "Advanced"

Without listing every toggle in `admin/settings.tsx`, the rule: anything that isn't changed more than once a quarter goes under an `Advanced` accordion at the bottom. Visible by default should be only: site title, support email, default locale, Stripe mode toggle. Everything else (SMTP overrides, feature flags, debug switches) collapses.

## F. Design elements that feel busy

Observed in the pieces I read:
- **Tab bar amber glow dot + scale + opacity + shadow** on every active tab — three effects stacked. Pick one (the dot). Removes visual noise on every screen.
- **Posters with `ring-1` + `shadow-[long]` + `group-hover:-translate-y-1.5` + `group-hover:ring-amber/30` + `group-hover:shadow-[longer]`** — five hover effects on a single card. Apple TV+ uses a single scale. Reduce to scale + ring color change.
- **Mask-image edge fade on every rail** — premium when used sparingly; with 6 rails on the home page it's repeated 6 times in a single scroll. Cutting rails to 4 fixes this implicitly.
- **`backdrop-blur-xl` everywhere** (tab bar, header, modals) — heavy on mobile GPUs. Keep on the tab bar (fixed, small); drop from full-width hero overlays if any.
- **Two CTA styles on hero** (`Watch Now` cream-bright with sheen animation, plus `Add to Watchlist` outlined) — fine, but the sheen animation on the primary CTA is a marketing-site flourish. Apple TV+'s play button has zero animation. Drop the sheen.
- **`promo-banner` + `trial-banner` + hero CTA + membership block + footer CTA** = five conversion surfaces on one page. Pick two.

## G. Duplicate functionality

- `auth-menu.tsx` (desktop dropdown) and `mobile-tab-bar.tsx` Account tab — same destination, two implementations. Keep both, but make sure they stay in sync via a shared component.
- `films-row.tsx` Rail and `continue-watching.tsx` horizontal scroller are 90% the same layout duplicated. Extract a single `<Rail>` primitive; both consume it. Reduces bundle and bugs.
- `membership-checkout.tsx` and `film-checkout.tsx` — two checkout flows. If the underlying Stripe shape is similar (line items + return URL), extract one `<Checkout>` and pass mode. Otherwise leave.
- Region/language switching exists in 3 places (welcome splash, header, footer). Pick one (header).

## H. Mobile-specific clutter

- Mobile hero has copy + 1 CTA, good. But the **synopsis 3-line clamp + uppercase metadata + amber dot separators** are dense for a 390px screen. Drop the synopsis on mobile under 640px; the film detail page has it.
- **Tab bar shows 3–4 tabs** — good shape now. Confirmed.
- **"Add to Watchlist" CTA on the hero for signed-in users** — secondary action on a hero is a Netflix pattern; on Apple TV+ this lives only on the film detail page. Consider removing it from hero to keep the hero single-intent.

## I. Things that are correct as-is, don't touch

- File-based routing structure under `_authenticated/`.
- `mobile-tab-bar` (just fixed).
- Featured hero composition (after sheen removal).
- Server-function data layer.
- Stripe webhook + email infra.
- Bilingual setup (en/fa). Keep.

---

## Suggested first batch (highest impact, lowest risk)

If you want to start cutting today, the three changes that will most visibly make the platform feel like Apple TV+ / MUBI:

1. **Home page diet** — remove `CollectionsGrid`, remove `FaqSection`, cap `FilmsRow` to 4 rails. (Section A)
2. **Kill the welcome splash + consolidate the three top banners into one priority slot.** (Section C)
3. **Admin consolidation** — merge marketing pages (Homepage/Pages/FAQ/Menu/Footer/Banner/Appearance) into one tabbed page. (Section D, biggest one)

Tell me which sections to act on (A, B, C, D, E, F, G, H) — or just say "all of it" — and I'll implement in build mode.

## What I did NOT review
- Email template inventory under `src/lib/email-templates/` (12 templates — likely some redundancy, but needs its own pass).
- Database schema for unused columns / tables.
- Stripe product catalog for obsolete prices.
- Actual rendered admin screens (only filenames). A second pass after you pick consolidation targets would confirm exact tab groupings.
