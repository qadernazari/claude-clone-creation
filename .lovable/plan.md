Keep the current amber Watch button style. Only refine sizing and proportions so it reads as a polished CTA rather than an oversized slab.

**File:** `src/components/featured-film.tsx` (line 389–399)

**Change (single line, className only):**
- From: `px-9 py-4 text-lg` with `gap-2.5`, icon `20x20`, wrapper `min-h-14`
- To: `px-6 py-2.5 text-sm` with `gap-2`, icon `16x16`, wrapper `min-h-12`
- Keep `rounded-xl`, `font-bold`, `bg-amber`, `hover:bg-amber-bright`, focus ring, `active:scale-[0.98]`
- Keep `tracking-wide` on the label for balance

Result: a compact, confident pill CTA — same design language, tighter proportions, better hierarchy against the title and metadata.

No other files touched. No design system, tokens, or colors changed.