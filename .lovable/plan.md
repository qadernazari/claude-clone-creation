# i18n audit — closed

The subagent audited `src/lib/i18n.tsx` and the full `src/` tree. Result:

- This project does **not** use a keyed translation dictionary. `useLocale().t` takes a bilingual object literal `t({ en, fa })` at each call site, so both languages ship inline wherever they are used.
- Because there are no dictionary keys, there is **no such thing as an "unused key"** to remove. Lists A / B / C from the original audit brief are all N/A.
- No file changes required.

Per the user's answer, closing the audit — no action to take.
