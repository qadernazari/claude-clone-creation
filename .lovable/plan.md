## Goal
Add a CI check that fails the build when inline `t({ en, fa })` calls are incomplete — missing `en`, missing `fa`, or empty string values — so translation gaps can't ship.

## Approach
Custom Node script + `package.json` script + CI step. No new runtime deps.

### 1. New script: `scripts/check-i18n.mjs`
- Walk `src/**/*.{ts,tsx}` (skip `node_modules`, `routeTree.gen.ts`, `dist`, `.output`).
- Parse each file with the TypeScript compiler API (already a transitive dep via Vite/tsgo) or a lightweight regex + AST fallback. Preference: TS compiler API for accuracy on JSX and template literals.
- For every `CallExpression` where callee is `t` (identifier) and the first arg is an `ObjectLiteralExpression`, validate:
  - Has both `en` and `fa` properties.
  - Both values are string/template literals (not `undefined`, not empty string, not whitespace-only).
  - No duplicate keys.
- Collect violations as `{ file, line, col, reason }`.
- Print a grouped report; exit `1` if any violations, else `0`.
- Support `--fix-list` flag that just prints affected files (useful locally).

### 2. Wire into `package.json`
Add:
```
"check:i18n": "node scripts/check-i18n.mjs"
```
And chain it into the existing lint/typecheck script the CI already runs (or add to a combined `"ci": "npm run typecheck && npm run check:i18n && npm run build"` if there's no aggregate script).

### 3. CI integration
- If the project has a CI workflow file (`.github/workflows/*.yml` or similar), add a step running `npm run check:i18n` before `build`.
- If no CI workflow exists yet, add a minimal `.github/workflows/ci.yml` that installs deps and runs `check:i18n` + `build` on push/PR.
- Since Lovable's own build pipeline runs `npm run build`, optionally prepend the check to `build` script so it also fails Lovable deployments — will confirm before doing this since it slows every build.

### 4. Bootstrap: clean existing violations
Run the script once during implementation, fix any incomplete `t({...})` sites found, then land the CI check green. If violations are extensive, list them and fix in the same PR.

## Out of scope
- No migration to key bundles.
- No detection of hardcoded strings outside `t()` (separate concern — option C from clarifying question).
- No runtime warnings; static check only.

## Open decision
Should the check also run as part of `npm run build` (blocks Lovable deploys), or only in GitHub CI (blocks PRs only)? Default in this plan: **GitHub CI only**, to keep local/preview builds fast.
