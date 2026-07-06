# Prime Video–Style Site Refresh

Rebuild the visual and interaction language of `/`, `/browse`, and every film-card surface to match the Prime Video reference video. Keep all backend, auth, checkout, admin, and data logic exactly as-is — this is a **presentation-layer refresh only**.

## What you'll see

### 1. Cinematic Hero Carousel (home + browse top)
- Full-bleed 16:9 backdrop art (uses `thumbnail_url` — desktop hero) with a right-to-left dark gradient so the left half is readable text, right half is pure art.
- Left column: large stylized title (uses the film's title treatment / logo art if present, else the localized title in a bold display font), a green "#1 in [region]" or "New" chip, a 2-line synopsis, and a primary "Watch now" pill + circular `+` (watchlist) and `i` (info) buttons.
- Right column: character/hero art bleeding to the right edge.
- Auto-rotates every 7s with a smooth cross-fade (Ken-Burns off — no zoom, just fade). Pagination dots bottom-center. Prev/next chevrons appear on hover on desktop. Pauses on hover, respects `prefers-reduced-motion`.
- Small age badge (13+ / 18+) bottom-right.
- Source: admin-picked featured films first, then top-ranked films as fallback. Cap at 5 slides.

### 2. Numbered "Top 10" Row
- Giant outlined numeral (1–10) sitting *behind* each poster, cut off at the bottom, in a heavy display font — same visual trick Netflix/Prime uses.
- Poster is 2:3 portrait, sits to the right of the numeral, overlapping it slightly.
- "NEW MOVIE / NEW EPISODE / NEW SERIES" corner tag when applicable.
- Horizontal scroller with snap points and edge-fade masks.

### 3. Hover-Expand Rows (desktop only)
- Regular content rows ("Popular", "Iranian classics", "Recently added"…).
- On hover of a card: the card grows ~1.35× **inline**, neighbors slide sideways to make room, and a details panel appears below the art with title, badges (age, year, duration, seasons), a 2-line synopsis, and Play / + / i mini-buttons.
- 200ms delay before expanding to avoid noise on fast mouse-throughs.
- On touch devices the expand is disabled; taps just navigate as today.

### 4. Top Nav Trim
- Slim dark bar: logo left, `Home / Films / Series / Live` center, search icon + language switcher + avatar + primary CTA right. Same links as today — just restyled to match the reference.
- Existing mobile tab bar stays untouched.

### 5. Film Cards Everywhere
- Portrait cards get the badge chip system (NEW / TOP 10 / 18+), a subtle 1px border, and a hover lift + soft glow. Consistent across home, browse, search results, related films.

## Where the code lands

New components (in `src/components/prime/`, so nothing existing is disturbed):
- `hero-carousel.tsx` — the top rotating hero.
- `top-ten-row.tsx` — the numbered row.
- `hover-row.tsx` — the hover-expand horizontal scroller + `hover-card.tsx` for a single item.
- `film-card.tsx` — new default poster card with badges + hover lift (used by `hover-row` and elsewhere).

Route edits:
- `src/routes/index.tsx` — replace the current hero + rows with `<HeroCarousel />` + `<TopTenRow />` + several `<HoverRow />`. Same data queries; just new presentation.
- `src/routes/browse.tsx` — thin hero (single-slide, no rotation) + `<HoverRow />` for each category.
- `src/routes/films.$slug.tsx` — swap the "You may also like" grid to a `<HoverRow />`.
- `src/components/films-row.tsx` — becomes a thin wrapper that renders `<HoverRow />` so any other page pulling it in benefits automatically.
- `src/components/featured-film.tsx` — reused inside `hero-carousel.tsx` as the single-slide variant.

Styles:
- Add a few tokens to `src/styles.css`: `--hero-fade`, `--card-hover-shadow`, a heavy display font for the giant numerals (Bebas Neue or the existing display face if it already reads bold enough).

## What stays untouched

- Backend/server functions, RLS, admin, checkout, membership, email templates.
- Data model — the new components read from the exact same queries the current home page uses.
- Mobile: hero carousel goes single-column with a full-bleed portrait, hover interactions disabled, everything else stacks as today.
- RTL: Persian layout mirrors correctly — text alignment, chevron direction, pagination dot order all flip.

## Ship plan

One pass, one PR-sized change:
1. Add `src/components/prime/*` and the design tokens.
2. Rewire `/` first (biggest visual win, easy to preview).
3. Rewire `/browse` and the related-films section on `/films/$slug`.
4. Restyle nav to match.
5. Typecheck + click through home → browse → a film page → back, in both LTR and RTL, to make sure nothing regressed.

## Not in this pass (say the word and I'll fold them in)

- Auto-playing preview video on card hover after ~2s (Prime does this; adds noticeable complexity + bandwidth).
- Custom title logo art per film (would need an admin upload field + migration).
- Sports / TV shows top-level nav tabs (we don't have that content model yet).