"""
Font regression check — Persian vs English text rendering.

For each page × locale, this script:
  1. Loads the page with the region cookie pre-set (skips the welcome modal).
  2. Reads computed `font-family` on the <html>, an <h1>, a <p>, a <button>, and
     an <input>-like element (when present).
  3. Asserts:
       - fa (Persian, RTL): IranSansX MUST be the first family in every stack.
       - en (English, LTR): IranSansX MUST NOT appear anywhere in the stack —
         it would leak Persian glyph metrics into Latin text.
  4. Saves a screenshot to tests/visual/screenshots/<locale>/<slug>.png for
     visual review. Not pixel-diffed (too noisy for a dev server); the
     computed-font assertion is the real regression guard.

Run:
  bun run test:visual   # or: python tests/visual/font-regression.py

Prereqs: dev server up on http://localhost:8080 (Vite `bun run dev`).
"""

from __future__ import annotations
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Page

ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:8080"

# Pages that must render correctly in both locales.
PAGES = [
    ("home", "/"),
    ("membership", "/membership"),
    ("about", "/about"),
    ("help", "/help"),
    ("contact", "/contact"),
    ("privacy", "/privacy"),
    ("terms", "/terms"),
    ("auth", "/auth"),
]

# (locale, region cookie value, expected html lang, expected html dir)
LOCALES = [
    ("en", "manual:global", "en", "ltr"),
    ("fa", "manual:iran", "fa", "rtl"),
]

# What each computed font-family string must / must not contain.
def assert_fa(family: str) -> str | None:
    if "IranSansX" not in family:
        return f"expected IranSansX in stack, got: {family}"
    # Must be first (before any Latin fallback).
    first = family.split(",")[0].strip().strip('"').strip("'")
    if first != "IranSansX":
        return f"IranSansX must be first family in fa mode, got first={first!r}"
    return None

def assert_en(family: str) -> str | None:
    if "IranSansX" in family:
        return f"IranSansX must NOT appear in en mode stack, got: {family}"
    return None


SELECTORS = [
    ("html", "html"),
    ("h1", "h1"),
    ("p", "main p, article p, body p"),
    ("button", "button"),
    ("input", "input, textarea"),
]

READ_FONTS_JS = """
(selectorList) => {
  const out = {};
  for (const [key, sel] of selectorList) {
    const el = document.querySelector(sel);
    if (!el) { out[key] = null; continue; }
    out[key] = getComputedStyle(el).fontFamily;
  }
  return out;
}
"""


async def check_page(page: Page, locale: str, expected_lang: str, expected_dir: str,
                     slug: str, path: str) -> list[str]:
    failures: list[str] = []
    url = f"{BASE_URL}{path}"
    try:
        await page.goto(url, wait_until="networkidle", timeout=20_000)
    except Exception as e:
        return [f"{locale}/{slug}: navigation failed: {e}"]
    await page.wait_for_timeout(400)

    doc = await page.evaluate(
        "() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir })"
    )
    if doc["lang"] != expected_lang:
        failures.append(f"{locale}/{slug}: <html lang> = {doc['lang']!r}, expected {expected_lang!r}")
    if doc["dir"] != expected_dir:
        failures.append(f"{locale}/{slug}: <html dir> = {doc['dir']!r}, expected {expected_dir!r}")

    fonts = await page.evaluate(READ_FONTS_JS, SELECTORS)
    checker = assert_fa if locale == "fa" else assert_en
    for key, family in fonts.items():
        if family is None:
            continue  # element not present on this page — fine
        err = checker(family)
        if err:
            failures.append(f"{locale}/{slug} <{key}>: {err}")

    shot_dir = SHOTS / locale
    shot_dir.mkdir(parents=True, exist_ok=True)
    try:
        await page.screenshot(path=str(shot_dir / f"{slug}.png"))
    except Exception:
        pass
    return failures


async def run_locale(pw, viewport: dict, locale: str, region_cookie: str,
                     expected_lang: str, expected_dir: str) -> list[str]:
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport=viewport,
        locale="fa-IR" if locale == "fa" else "en-US",
    )
    # Pre-set the region cookie so the welcome modal never blocks the page.
    await context.add_cookies([{
        "name": "iran_region",
        "value": region_cookie,
        "url": BASE_URL,
    }])
    page = await context.new_page()

    all_failures: list[str] = []
    for slug, path in PAGES:
        all_failures.extend(
            await check_page(page, locale, expected_lang, expected_dir, slug, path)
        )
    await browser.close()
    return all_failures


async def main() -> int:
    async with async_playwright() as pw:
        failures: list[str] = []
        # Desktop pass. Mobile can be added later if needed — the same CSS
        # cascade applies at every width.
        viewport = {"width": 1280, "height": 900}
        for locale, region_cookie, lang, direction in LOCALES:
            print(f"→ checking {locale} ({region_cookie})")
            f = await run_locale(pw, viewport, locale, region_cookie, lang, direction)
            failures.extend(f)

    if failures:
        print("\nFONT REGRESSION FAILURES")
        for line in failures:
            print(f"  ✗ {line}")
        print(f"\n{len(failures)} failure(s). Screenshots in {SHOTS.relative_to(ROOT.parent.parent)}/")
        return 1

    print(f"\nAll font checks passed for {len(PAGES)} pages × {len(LOCALES)} locales.")
    print(f"Screenshots saved to {SHOTS.relative_to(ROOT.parent.parent)}/")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
