#!/usr/bin/env node
/**
 * Font-override lint.
 *
 * Fails CI if any file under src/ introduces a font override that would break
 * the Persian typography cascade (`[lang="fa"] *` in styles.css). Bans:
 *
 *   1. Tailwind `font-sans` and `font-serif` utility classes in JSX.
 *      These pin an element to Space Grotesk / Fraunces / ui-serif and beat
 *      the Persian cascade, showing Latin glyphs for Persian text.
 *   2. Inline `fontFamily: "..."` styles hardcoding a family name.
 *
 * NOT banned:
 *   - `font-mono` — legitimate for IDs, refs, kbd, coupon codes (Latin-only
 *     technical data). The Persian cascade overrides it anyway if it ever
 *     wraps Persian text.
 *   - Any override inside `src/lib/email-templates/` — those render HTML for
 *     external mail clients, which don't inherit the site cascade.
 *   - Any line with a trailing `// font-lint-ok` comment (opt-out for
 *     unusual but reviewed cases).
 *   - CSS variables like `fontFamily: 'var(--font-body)'` — those follow
 *     the theme.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const ALLOW_DIRS = [
  "src/lib/email-templates", // external mail HTML
];

// Tailwind classes that pin a Latin font family.
const BANNED_CLASS_RE = /\b(?:font-sans|font-serif)\b/;

// Inline React style like fontFamily: "Space Grotesk" or fontFamily: 'Fraunces, ...'
// Ignores `var(--font-...)` — those follow the theme.
const INLINE_FF_RE = /fontFamily\s*:\s*(['"`])(?!.*var\(--font)[^'"`]+\1/;

// Allow raw CSS `font-family:` in .css files only if it references a var/token.
const RAW_CSS_FF_RE = /font-family\s*:\s*(?!var\(|inherit|initial|unset)[^;]+;/;

/** @type {{file: string; line: number; snippet: string; rule: string}[]} */
const failures = [];

function isAllowlisted(rel) {
  return ALLOW_DIRS.some((d) => rel === d || rel.startsWith(d + "/"));
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (/\.(tsx?|jsx?|css)$/.test(name)) {
      scan(p);
    }
  }
}

function scan(absPath) {
  const rel = relative(ROOT, absPath);
  if (isAllowlisted(rel)) return;

  const src = readFileSync(absPath, "utf8");
  const lines = src.split("\n");
  const isCss = absPath.endsWith(".css");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("font-lint-ok")) continue;

    if (!isCss && BANNED_CLASS_RE.test(line)) {
      failures.push({
        file: rel,
        line: i + 1,
        snippet: line.trim(),
        rule: "banned Tailwind class (font-sans / font-serif)",
      });
    }
    if (!isCss && INLINE_FF_RE.test(line)) {
      failures.push({
        file: rel,
        line: i + 1,
        snippet: line.trim(),
        rule: "hardcoded inline fontFamily",
      });
    }
    if (isCss && RAW_CSS_FF_RE.test(line) && rel !== "src/styles.css") {
      // Only styles.css is allowed to declare raw font-family values (the
      // theme tokens live there). Other CSS files must reference tokens.
      failures.push({
        file: rel,
        line: i + 1,
        snippet: line.trim(),
        rule: "raw font-family outside styles.css (use var(--font-*))",
      });
    }
  }
}

walk(SRC);

if (failures.length) {
  console.error("Font-override lint failed:\n");
  for (const f of failures) {
    console.error(`  ✗ ${f.file}:${f.line}  [${f.rule}]`);
    console.error(`      ${f.snippet}`);
  }
  console.error(
    `\n${failures.length} violation(s). These break IranSansX in Persian mode.`,
  );
  console.error(
    `Fix by removing the class/inline style, or add \`// font-lint-ok\` on the line if intentional.`,
  );
  process.exit(1);
}

console.log("Font-override lint passed.");
