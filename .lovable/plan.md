## Fix: header trial CTA wraps to two lines

The header CTA renders inside a fixed 132px container with `py-2` padding, so "Accept Free Trial" wraps to two lines in Safari and most desktop widths. The fix is small and lives entirely in `src/components/site-header.tsx` (`MembershipCta`).

### Changes

In `src/components/site-header.tsx` lines ~420–438:

1. Shorten the label to keep the pill compact across all browsers:
   - EN: `"Accept Free Trial"` → `"Free Trial"`
   - FA: `"پذیرش رایگان"` → `"شروع رایگان"`
2. Drop the fixed `w-[132px]` wrapper so the pill sizes to its content.
3. Replace `py-2` with a fixed `h-9` and add `whitespace-nowrap leading-none` so the text can never wrap.
4. Match the placeholder spacer to the new height (`h-9 w-[110px]`) so the header layout doesn't shift while subscription status loads.

No other files, no logic changes — purely a presentational fix to the header pill.
