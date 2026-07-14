# Persian digit formatting — fix remaining gaps

Audit found the app is ~90% clean. `num()` and `year()` in `src/lib/i18n.tsx` are used consistently across rails, hero, film detail, library tabs, membership cards, watch countdowns, and continue-watching. Below are the concrete leaks where Latin digits still render in `fa`.

## 1. Add a shared helper

In `src/lib/i18n.tsx`, add and export a small `toPersianDigits(input: string | number): string` that maps `0-9` → `۰-۹`. Use it in the watch player where we need to localize mixed strings (`"1:23 / 4:56"`, `"1.25×"`, `"+10s"`). Also expose it from the `useLocale()` return so components can grab it alongside `num`/`year`.

Also verify `num(4.5)` renders `۴٫۵` (Persian decimal separator). If it renders Latin `.`, switch decimal call sites to `Intl.NumberFormat("fa-IR", { minimumFractionDigits: 1 }).format(...)` or use `toPersianDigits(n.toFixed(1))` for the review avg.

## 2. Watch player (`src/routes/_authenticated/watch.$slug.tsx`)

- Scrubber timecode at ~L981-987 (`fmtTime`): localize digits when `fa`.
- Playback-speed badge/menu items at ~L1039, L1055: `{speed}×` → `fa ? toPersianDigits(String(speed)) : speed`.
- HUD flashes at ~L535/540/552/605/615/910/929: wrap the numeric segments (`${delta}s`, `${vol}%`, `${pct*100}%`, `${speed}×`, `-10s/+10s`) with `toPersianDigits` when `fa`.
- Seek ripple label at ~L1097: `"+10s" / "−10s"` → localized digits.
- Replace the ad-hoc regex swap at L1111 with the shared helper.

## 3. Library history progress (`src/routes/_authenticated/library.tsx`)

L230 progress percent: wrap `Math.round(...)` in `num()`. Replace the manual regex swap in `formatTime` (L534-543) with the shared helper for consistency.

## 4. Membership copy

- `src/components/membership-panel.tsx` L54-55 (`daysLeft`) and L197-202 (`planLabel`): destructure `num` from `useLocale()` and use `num(n)` / `num(planMonths)` inside the `fa` template string.
- `src/components/membership-checkout.tsx` L64-66 (`monthsLabel`): destructure `num` and use `` `${num(plan.months)} ماه` ``.

## 5. Reviews (`src/components/film-reviews-section.tsx`)

- L174 avg rating: `num(avg)` (after confirming decimal handling, otherwise `toPersianDigits(avg.toFixed(1))`).
- L183 review count: `num(agg.review_count)`.
- L258 star readout `${rating} / 5`: localize both numbers when `fa`.
- L278 char counter `{body.length} / 2000`: localize when `fa`.

## 6. Left as-is (documented)

- USD price fallback on film detail (intentional — USD stays Latin).
- `ir-pay-panel.tsx` already uses `toLocaleString("fa-IR")`; correct output, leave alone.
- `film.age_rating` string badge on film detail: values may be codes like `PG-13`; we'll leave as-is unless product confirms it's numeric.
- `h`/`m` unit letters in watch countdown: digit-formatting-only scope; unit localization is out of scope.

## Verification

- Grep after edits: no remaining `${\w+}` raw-number templates inside `fa` branches of `t(...)` or the files above.
- Manual check in `fa` locale: play a film and confirm scrubber, speed, HUD, seek-ripple all show Persian digits; open a review; view library history; view membership card.
