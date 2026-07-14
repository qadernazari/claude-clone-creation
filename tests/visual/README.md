# Visual / font regression

Guards against future regressions where a component hardcodes a Latin font
(`font-sans`, inline `fontFamily`, etc.) and breaks Persian typography — or the
reverse, where IranSansX leaks into the English stack.

## What it checks

For each locale (`en`, `fa`) on 8 key pages (home, membership, about, help,
contact, privacy, terms, auth):

1. `<html lang>` and `<html dir>` match the locale.
2. Computed `font-family` on `<html>`, `<h1>`, `<p>`, `<button>`, `<input>`:
   - **fa**: `IranSansX` must be the **first** family in the stack.
   - **en**: `IranSansX` must **not** appear anywhere in the stack.
3. A screenshot is saved to `tests/visual/screenshots/<locale>/<slug>.png`
   for manual review. Not pixel-diffed — computed-font assertions are the
   real guard; screenshots are artifacts.

## Run

```bash
bun run dev          # in another terminal, dev server on :8080
bun run test:visual  # runs the check
```

Exits non-zero on the first regression with a report of every failing
`locale/page/selector` combination.
