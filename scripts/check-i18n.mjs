#!/usr/bin/env node
/**
 * i18n completeness check.
 *
 * Fails the build when an inline `t({ en, fa })` call is incomplete:
 *   - missing the `en` property
 *   - missing the `fa` property
 *   - either value is an empty / whitespace-only string literal
 *   - duplicate `en` or `fa` property
 *
 * Values that are dynamic expressions (identifiers, member access, template
 * literals with substitutions, conditionals, etc.) are accepted — we can only
 * lint what is statically visible.
 *
 * Usage:
 *   node scripts/check-i18n.mjs           # scans src, exits non-zero on violations
 *   node scripts/check-i18n.mjs --list    # prints only the file paths with violations
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const SKIP_DIR = new Set(["node_modules", "dist", ".output", ".vinxi", ".tanstack"]);
const SKIP_FILE = new Set(["routeTree.gen.ts"]);
const LIST_ONLY = process.argv.includes("--list");

/** @type {{file: string; line: number; col: number; reason: string}[]} */
const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name) && !SKIP_FILE.has(name)) {
      checkFile(full);
    }
  }
}

function isEmptyStringLiteral(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.trim() === "";
  }
  return false;
}

function checkFile(file) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(ROOT, file).split(sep).join("/");

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "t" &&
      node.arguments.length >= 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const obj = node.arguments[0];
      const seen = new Map(); // name -> count
      let enProp;
      let faProp;
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        let key;
        if (ts.isIdentifier(prop.name)) key = prop.name.text;
        else if (ts.isStringLiteral(prop.name)) key = prop.name.text;
        else continue;
        seen.set(key, (seen.get(key) ?? 0) + 1);
        if (key === "en") enProp = prop;
        if (key === "fa") faProp = prop;
      }
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      const pos = { file: rel, line: line + 1, col: character + 1 };

      if (!enProp) violations.push({ ...pos, reason: "missing `en`" });
      if (!faProp) violations.push({ ...pos, reason: "missing `fa`" });
      if (seen.get("en") > 1) violations.push({ ...pos, reason: "duplicate `en`" });
      if (seen.get("fa") > 1) violations.push({ ...pos, reason: "duplicate `fa`" });
      if (enProp && isEmptyStringLiteral(enProp.initializer)) {
        violations.push({ ...pos, reason: "`en` is empty string" });
      }
      if (faProp && isEmptyStringLiteral(faProp.initializer)) {
        violations.push({ ...pos, reason: "`fa` is empty string" });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

walk(SRC);

if (violations.length === 0) {
  console.log("✓ i18n check passed — all t({en, fa}) calls are complete");
  process.exit(0);
}

if (LIST_ONLY) {
  const files = [...new Set(violations.map((v) => v.file))].sort();
  for (const f of files) console.log(f);
  process.exit(1);
}

console.error(`✗ i18n check failed — ${violations.length} violation(s):\n`);
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}
for (const [file, list] of [...byFile.entries()].sort()) {
  console.error(`  ${file}`);
  for (const v of list) console.error(`    ${v.line}:${v.col}  ${v.reason}`);
  console.error("");
}
process.exit(1);
