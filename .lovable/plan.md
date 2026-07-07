## Fix

In `src/routes/_authenticated/watch.$slug.tsx`, the resume-watching modal (line 1110) shows `از 0:30?` with a Latin question mark and Latin digits.

**Change line 1110** — in the Persian branch:
- Convert the time string to Persian digits (`0` → `۰`, `1` → `۱`, …, `9` → `۹`).
- Replace `?` with Persian question mark `؟`.

Implementation: small inline helper `toFa(s)` that maps ASCII digits to `۰۱۲۳۴۵۶۷۸۹`, applied only in the `fa` branch. Result: `از ۰:۳۰؟` in Persian; English branch stays `Resume from 0:30?`.

Scope limited to this one line — the player HUD clock (currentTime / duration) keeps Latin digits as before.
