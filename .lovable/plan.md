## Problem

On the film page, the Persian title (`h1`) uses `font-black` (Tailwind 900) while everything else in Persian — section headings, meta labels, the synopsis paragraph — uses weights that map to a real IranSansX face (400/500/700). Only weights 300–700 of IranSansX are self-hosted, so 900 gets **faux-bolded** by the browser: thicker, blurrier, optically different from every other Persian heading and paragraph. That's the "font looks different" you're seeing between the title and the paragraph below it.

## Fix

Single-line change in `src/routes/films.$slug.tsx` (film-page hero title, ~line 681):

- Replace `font-black` with `font-bold` so the Persian title renders in the real IranSansX Bold (700) — the same weight `styles.css` already forces on every other Persian `h1–h4`. Latin fallback (Space Grotesk) also has a real 700, so English titles stay crisp too.

No other file needs changes: the global rule in `src/styles.css` (`[lang="fa"] h1…h4 { font-weight: 700 }`) already keeps every other Persian heading at the same weight, and body text stays at 400 via `--font-body`. After this edit, the hero title, section headings ("درباره این فیلم", "بازیگران و عوامل"), and the synopsis paragraph all render with the same IranSansX family and consistent, actually-loaded weights.

## Verification

- Reload `/films/sheikh-lotfollah-monar-jonban` in Persian and confirm the hero title matches the visual weight of the section headings below it (no synthetic bold, no blurring).
- Latin numerals/words inside the Persian title still fall back to Space Grotesk via `unicode-range` — unchanged.