## Goal

Make every piece of English copy on IRAN feel like one product written by one person — short, direct, useful, on par with Netflix/Apple TV help-center voice — and fix the one structural problem in the current copy: half of it claims "tickets only, no subscription," while the codebase and homepage FAQ actually run a membership-with-7-day-trial product plus Premium pay-per-view tickets.

## The product story (single source of truth)

Every page will tell the same story:

- **IRAN Membership** — monthly subscription, 7-day free trial, cancel anytime. Unlocks the membership catalog (originals, documentaries, curated collections).
- **Premium tickets** — select films sold separately as pay-per-view, even for members. Each film page shows whether it's included or Premium.
- **Direct filmmaker support** — every film has a "Support the filmmaker" option; tips pass through transparently.
- **Bilingual, worldwide, no ads.**

## Voice & style rules

- American spelling: *center, color, license, organization, behavior*.
- Plain sentences, ~15 words avg. No "we exist to," "uncompromising," "premium home for."
- Active verbs. Lead with the answer.
- Numbers as digits ("7-day," "48 hours," "2 streams"), prices with currency.
- One em-dash max per sentence. No semicolons in body copy.
- Sentence case for headings ("Your account," not "Your Account").
- Buttons: ≤3 words, verb-first ("Start free trial," "Watch now," "Buy ticket").

## What gets rewritten

### 1. CMS pages (`site_content.data` → `pages` key) — DB migration

Rewrite the EN side of every page; FA stays untouched in this pass (separate turn).

- **about** — open with what IRAN is in one sentence, then How it works (Membership / Premium / Support), then Who it's for. Drop "premium home for Iranian short cinema."
- **terms** — add Membership + Trial + Cancellation + Premium tickets sections alongside the existing Account / Content / Acceptable use / Changes blocks. Plain language, numbered viewing windows.
- **privacy** — tighten. Keep What we collect / How we use it / Your rights / Retention / International. American spelling.
- **refunds** — already hybrid-aware; rewrite as: Free trial (no charge) → Membership renewals (14-day grace if <60 min watched) → Premium tickets (non-refundable after play, full refund on our fault) → Filmmaker tips (non-refundable) → How to request.
- **help** — restructure into 3 cards: Account & sign-in / Membership & trial / Tickets & playback. Tighten body to 2 sentences + contact.
- **devices** — keep structure, shorten bullets, fix British spelling.
- **cookies** — keep, tighten to 4 short paragraphs.
- **press** — tighten contact intro + press-kit bullets.
- **careers** — keep "no open roles" message, shorten by half.
- **submit** — keep technical requirements, tighten intro and revenue blocks.
- **contact** — already 2 sentences; just polish.

### 2. CMS FAQ (`site_content` key `faq`) — DB migration

Replace all 10 Q&As to match the hybrid model. New question set:

1. What is IRAN Membership?
2. How much does it cost? Is there a free trial?
3. What's included in membership vs. Premium tickets?
4. How long can I watch a Premium ticket?
5. Can I cancel anytime?
6. Which devices are supported?
7. Where in the world can I watch?
8. Are subtitles available?
9. How do filmmakers get paid?
10. How do refunds work?

(Persian FA side left for a follow-up turn.)

### 3. CMS hero subtitle + announcement defaults (`site_content` key `settings`) — DB migration

- `hero.en.subtitle`: replace *"No subscription — pay only for what you watch"* with membership-led copy, e.g. *"Iranian short films, streaming worldwide. Start a 7-day free trial — cancel anytime."*
- `hero.en.kicker` and `title`: keep, light polish.

### 4. Hardcoded EN strings (code edits)

A focused sweep of components that ship English in source, not CMS. For each: tighten to the new voice, fix any "tickets only" framing, Americanize spelling.

- `src/components/faq-section.tsx` — homepage FAQ. Already on-model; trim each answer ~20%, Americanize ("colour" etc. if any), align wording with the new CMS FAQ so home page and `/faq` overlay don't contradict.
- `src/components/site-footer.tsx` — tagline "Home of Iranian cinema" stays; verify nav labels match CMS `nav`.
- `src/components/welcome-splash.tsx` — heading + region buttons (cross-check with CMS `welcome` defaults).
- `src/components/featured-film.tsx` — any inline CTA / badge text.
- `src/components/membership-checkout.tsx`, `film-checkout.tsx`, `contribute-modal.tsx`, `accept-trial-button.tsx`, `trial-banner.tsx`, `trial-expired-modal.tsx`, `promo-banner.tsx`, `coupon-field.tsx` — labels, helper text, error/empty states.
- `src/components/auth-menu.tsx`, `src/routes/auth.tsx`, `src/routes/reset-password.tsx` — form labels, button text, error copy, success toasts.
- `src/routes/_authenticated/account.tsx`, `_authenticated/my-tickets.tsx`, `_authenticated/library.tsx`, `_authenticated/watch.$slug.tsx` — section headings, empty states, "no purchases yet"-style copy.
- `src/routes/browse.tsx`, `films.$slug.tsx`, `checkout.return.tsx`, `unsubscribe.tsx` — page titles, descriptions, success/error messages.
- `src/components/empty-state.tsx`, `mobile-tab-bar.tsx`, `site-header.tsx`, `continue-watching.tsx`, `collections-grid.tsx`, `films-row.tsx`, `film-reviews-section.tsx`, `membership-panel.tsx` — labels, eyebrow text, button text.
- `src/lib/cms.ts` — `DEFAULT_BUTTON_LABELS`, `DEFAULT_HERO`, `DEFAULT_WHY_IRAN`, `DEFAULT_WELCOME`, `DEFAULT_BANNER`, `DEFAULT_FAQ`, `DEFAULT_FOOTER` defaults: align with new voice so any future fresh install ships the same words.

### 5. SEO metadata sweep

Every route's `head()` title + description: ≤60 chars title, ≤160 chars description, consistent with new product story.

- `src/routes/index.tsx` — "IRAN — Iranian short films, streaming worldwide" + subtitle that mentions free trial.
- `routes/browse.tsx`, `films.$slug.tsx`, `about.tsx`, `contact.tsx`, `press.tsx`, `auth.tsx`, `reset-password.tsx` — fresh titles/descriptions.

### 6. Cross-check & QA

- Read every route once to ensure no remaining "no subscription / tickets only" sentence.
- Grep for British→American: `colour`, `centre`, `licence`, `organis`, `behaviour`, `realise`, `practise`.
- Verify homepage FAQ (`faq-section.tsx`) and CMS `/faq` overlay show the same 10 questions.
- Confirm new English does not break any FA layout that relies on string length (welcome splash, hero, buttons).

## What is NOT in this plan

- Persian (FA) copy — separate turn after you sign off on the English.
- Email templates (`src/lib/email-templates/*`) — separate turn, lots of files, deserve their own pass.
- Visual / layout changes — copy only.
- Pricing numbers, trial length, viewing-window length — I'll use what the code currently uses (7-day trial, 48-hour window). If any of those are wrong, tell me before I start.

## Technical notes (for me, not for you)

- DB rewrites land as one migration that `UPDATE`s `site_content` rows for keys `pages`, `faq`, and `settings`.
- All code edits go through search-replace per file; no component restructuring.
- After edits, run a grep sweep for British spellings + the phrases "no subscription," "tickets only," "pay per film" outside of the Premium-tickets context.

## Deliverable

After approval I'll execute in this order: (1) DB migration for pages/faq/settings, (2) homepage FAQ component, (3) cms.ts defaults, (4) hardcoded component sweep, (5) route metadata, (6) final grep QA. Then I'll report back with a short diff summary.
