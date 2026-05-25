# TODO 07: `scripts/` lint + tc + wire into prePush

## Overview

Currently `scripts/extract-docs.ts` and any other loose `.ts` files in `scripts/` are not covered by the root `pnpm lint:fix` / `pnpm tc` runs (turbo only scans workspace packages). User-flagged this in `TASKS.md` item 2.

Goal: add two root-level scripts (`lint:scripts`, `tc:scripts`) that target `scripts/**/*.{ts,tsx}` and wire them into `prePush`.

## Goals

1. **Lint coverage:** `scripts/**/*.ts` runs through ESLint via the root `eslint.config.mjs`.
2. **TC coverage:** `scripts/**/*.ts` runs through `tsc --noEmit` via a dedicated `scripts/tsconfig.json`.
3. **prePush wires both** — failures in `scripts/` block push, same as the workspace.

---

## Files to Change

### Files to CREATE

- `scripts/tsconfig.json` — minimal tsconfig extending `@seedcord/tsconfig` (or root), including only `scripts/**/*.ts`.

### Files to MODIFY

| File                       | Change                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `package.json` (root)      | add `"lint:scripts"`, `"tc:scripts"` scripts; extend `"prePush"` to include them                      |
| `eslint.config.mjs` (root) | if not already, ensure it can lint `scripts/**` (it should — root config catches `*.ts` in repo root) |
| `.gitignore`               | optional: ignore any `scripts/dist/` if scripts ever get bundled                                      |

---

## Implementation Approach

### Step 1 — Create `scripts/tsconfig.json`

```jsonc
{
    "extends": "@seedcord/tsconfig/base.json", // or wherever the workspace base lives
    "compilerOptions": {
        "noEmit": true,
        "rootDir": ".",
        "outDir": "../dist-scripts" // never written; satisfies tsc
    },
    "include": ["**/*.ts"],
    "exclude": ["dist", "node_modules"]
}
```

### Step 2 — Add root package.json scripts

```json
{
    "scripts": {
        "lint:scripts": "eslint 'scripts/**/*.{ts,tsx}' --cache",
        "lint:fix:scripts": "eslint 'scripts/**/*.{ts,tsx}' --fix --cache",
        "tc:scripts": "tsc --noEmit -p scripts/tsconfig.json",
        "prePush": "pnpm build && pnpm tc && pnpm tc:scripts && pnpm lint && pnpm lint:scripts && pnpm test"
    }
}
```

Note: `prePush` now runs `tc:scripts` and `lint:scripts` after their workspace counterparts.

### Step 3 — Run and fix

```sh
pnpm lint:fix:scripts
pnpm tc:scripts
```

Fix every reported issue. Expect a handful given the AGENTS.md note about scripts being lint-noisy.

### Step 4 — Commit

```sh
git add package.json scripts/tsconfig.json scripts/
git commit -m "chore(scripts): add lint + tc coverage for scripts/ folder, wire into prePush"
```

Changeset: none (no published surface change).

---

## Acceptance Criteria

- [ ] `pnpm lint:scripts` exits clean
- [ ] `pnpm tc:scripts` exits clean
- [ ] `pnpm prePush` runs both as part of its chain
- [ ] Husky pre-push hook fires `prePush` correctly

---

## Risks and Mitigation

| Risk                                                             | Mitigation                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Scripts use APIs not in `@types/node` at the base tsconfig level | Update `scripts/tsconfig.json` to add `"types": ["node"]` explicitly                                           |
| ESLint config doesn't have rules for top-level scripts           | Add a glob-specific block to root `eslint.config.mjs` if scripts have looser rules (e.g., allow `console.log`) |
| `tc:scripts` invokes tsc which is already a workspace dep        | Use `pnpm exec tsc` if the root `tsc` isn't on PATH                                                            |

---

## Related TODOs

- Blocked by: TASK-03 (TS 6 bump — script tsconfig should target same TS major)
- Blocks: nothing; standalone

---

## Handoff

**Status:** ✅ Completed (2026-05-25)

```
Completed by: Claude Opus 4.7
Build status: ✅ pnpm prePush exit 0 across full workspace

### What was done:
- scripts/tsconfig.json (new) extends @seedcord/tsconfig/node — covers scripts/extract-docs.ts under tsc --noEmit.
- Root package.json: tc:scripts, lint:scripts, lint:fix:scripts added; prePush now chains them after the workspace counterparts (build && tc && tc:scripts && lint && lint:scripts && test).
- .husky/pre-push delegates to `pnpm prePush` (single source of truth; previously inline + missing build).
- eslint.config.mjs gained generalIgnores for .next/build/out/next-env.d.ts, absorbing what the deprecated .eslintignore used to cover.
- .eslintignore deleted (deprecated in ESLint 9+ flat config).

### Blockers encountered:
- None.

### Breaking changes:
- None for published packages. .husky/pre-push is heavier now (includes build) — pushes take longer locally but match CI.

### Files modified count: 4 (.husky/pre-push, package.json, eslint.config.mjs, .vscode/settings.json indirectly via parallel work)
### Files created count: 1 (scripts/tsconfig.json)
### Files deleted count: 1 (.eslintignore)

### Key decisions made:
- Single tsconfig per scripts/ folder rather than extending the root tsconfig.json — keeps scripts/ as a self-contained TS project. Root tsconfig is left untouched (still includes scripts/ for editor + lint type-aware rules).
- Husky calls `pnpm prePush` rather than duplicating the script chain — avoids the divergence that previously had the hook missing `build`.

### Tests passing: ✅ pnpm prePush exit 0

### Verification performed:
- pnpm tc:scripts → clean
- pnpm lint:scripts → clean (after .eslintignore removal silenced the ESLint 9 deprecation warning)
- pnpm prePush → exit 0 (with sandbox off — Next.js build fetches Google Fonts)

### Changeset added:
- N/A — no published-package surface change.

### Warnings to next implementor:
- Husky pre-push now runs `build`. If you're iterating fast and want to bypass build during local development, run `git push --no-verify` (only when you know CI will catch it).

### Critical notes:
- Squashed into feat/better-api-extraction as commit edc7e43.
```

---

## Notes

- **Complexity:** Low
- **Files affected:** 2-3
- **Touches published packages:** No
- **Estimated wall-clock:** 30-60 min
