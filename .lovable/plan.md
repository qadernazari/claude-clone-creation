# Plan

## 1. Featured Film — remove mobile overlay text
File: `src/components/featured-film.tsx`
- Delete the mobile title overlay block inside `SlideImageFrame` (the "WALKING TOUR / اختصاصی" kicker + `<h2>` title centered at the bottom of the image on mobile).
- Keep the image, dots, and Watch button below. Desktop info panel stays unchanged.
- Reduce bottom gradient darkness on mobile since there's no text to protect (soften the `linear-gradient` to a very light fade so the photo reads cleaner).

## 2. Top Header — tighten spacing + simpler region switcher (mobile only)
File: `src/components/site-header.tsx`
- Reduce clutter on mobile:
  - Tighten horizontal padding: `px-5` → `px-4` on mobile.
  - Tighten gap between right-side icons on mobile: `gap-1.5` → `gap-1`.
  - Shrink icon buttons on mobile only from `h-10 w-10` → `h-9 w-9` (keep desktop at 10).
  - Reduce header vertical padding slightly on mobile.
- Simpler region switcher (`RegionToggle` mobile trigger):
  - Replace the bordered pill with a minimal ghost button: no border, no inset shadow, no background fill.
  - Show a small globe icon + short label (`EN` / `فا`) instead of the full "Global" / "ایران" wordmark and chevron. Remove the chevron on mobile.
  - Keep the bottom sheet unchanged when tapped.
- Desktop layout (segmented Global/ایران control, nav, membership button) is untouched.

## Notes
- No content or logic changes elsewhere.
- Bottom tab bar is not touched (user asked for the top header).
- Persian font cascade and RTL behavior preserved.
