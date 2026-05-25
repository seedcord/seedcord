# TODO 03: Dep bump — TS ecosystem

## Overview

Bump TypeScript, typescript-eslint, ESLint, Vite, Vitest, and related dev tooling to latest stable per `.vscode/docs/DEP_RESEARCH_TS_ECO.md`. Per the research, these MUST bump together: **TS 6 + typescript-eslint 9 + ESLint 10 + engines.node bump** in one PR; **Vite 8 + Vitest 4.1.7** in a second commit.

## Goals

1. **TS 6.0.3 across the workspace.** Workspace catalog `peer.typescript: 6.0.3`. Every `tsc --noEmit` passes.
2. **typescript-eslint 9.x in lockstep with TS 6.** ESLint config compiles + every package lints clean at 0 errors / 0 warnings.
3. **ESLint 10 + flat-config consistency.** `@eslint/eslintrc` deleted as dead dep from `packages/eslint-config`. `engines.node` bumped to `^22.13.0`.
4. **Vite 8 + Vitest 4.1.7 (lockstep).** Catalog update. Verify `vitest run` exits clean.
5. **No version drift in lockfile.** `pnpm install --frozen-lockfile` clean after every commit.

## Source of truth

`.vscode/docs/DEP_RESEARCH_TS_ECO.md` — the per-dep research with breaking changes, migration recipes, and security notes. **Read it before starting.**

---

## Files to Change

### Files to DELETE Entirely

- `packages/eslint-config/package.json` — remove `@eslint/eslintrc` dep (becomes dead with ESLint 10)
- `packages/eslint-config/src/**` — any `eslintrc`-bridge code (likely already none; verify)

### Files to MODIFY (sketch — exact diffs come from research doc)

| File                                                              | Change                                                                                                                   | Why                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `pnpm-workspace.yaml`                                             | bump `peer.typescript`, `lint.@typescript-eslint/*`, `lint.eslint-*`, `build.vite`, `testing.vitest`                     | catalog drives every consumer  |
| `package.json` (root)                                             | bump `engines.node` to `^22.13.0`                                                                                        | ESLint 10 requirement          |
| `packages/tsconfig/base.json` (or wherever the shared base lives) | flip `esModuleInterop: true`, add explicit `"types": ["node"]`                                                           | TS 6 dropped implicit settings |
| Every `tsconfig.json` extending the base                          | inherit the new shape; manual audit for places that override `esModuleInterop` or `types`                                | TS 6 strictness                |
| `packages/eslint-config/src/**`                                   | tighten to flat-only API (no `eslintrc` compatibility layer)                                                             | ESLint 10                      |
| Per-package `eslint.config.mjs`                                   | no expected changes; confirm flat config works under ESLint 10                                                           | sanity check                   |
| `vitest.config.ts` (root + per-package)                           | confirm Vite 8 compat; `build.rollupOptions` → `build.rolldownOptions` if present (likely none in seedcord vitest setup) | Vite 8 Rolldown                |

### Per-package src impact (expected from TS 6 strict shift)

The research doc lists specific call sites the TS 6 strict shifts affect. Walk each package's `tc` output after the catalog bump and fix the cascade. Expect:

- A handful of `import` shape fixes (default-only imports needing `import type` or `* as`)
- `@types/node` types missing where `tsconfig` no longer auto-includes them
- Possibly a few `any` → `unknown` requirements where TS 6 narrows `any` propagation

---

## Implementation Approach

### Step 1 — Block 1: TS + typescript-eslint + ESLint + engines

1. Update catalog versions (TS 6.0.3, typescript-eslint 9.x latest, ESLint 10.x latest, plugins)
2. Update `tsconfig` base: `esModuleInterop: true`, `types: ["node"]`
3. Update root `package.json` `engines.node` to `^22.13.0`
4. Run `pnpm install`
5. Run `pnpm tc` — fix surfaced errors per the research doc's migration recipe section
6. Run `pnpm lint:fix` — fix surfaced lint errors (typescript-eslint 9 has new defaults)
7. Run `pnpm test`
8. Run `pnpm build`
9. Commit: `chore(deps): bump TS 5.9 → 6.0, typescript-eslint 8 → 9, ESLint 9 → 10`
10. Add changeset: `pnpm cs` — patch on every published package (devDep / peer changes only, no API drift; but record the engines bump for downstream users)

### Step 2 — Block 2: Vite 8 + Vitest 4.1.7

1. Update catalog: `build.vite`, `testing.vitest`, `testing.@vitest/coverage-v8`
2. Run `pnpm install`
3. Run `pnpm test` — fix any vitest API drift
4. Run `pnpm build`
5. Commit: `chore(deps): bump Vite 7 → 8, Vitest 4.0 → 4.1.7`

### Step 3 — Block 3: tooling tail (tsx + lint-staged + commitlint + changesets + prettier)

Per research doc, these are mostly minor / patch bumps. Bundle into one commit.

```
chore(deps): bump tsx, lint-staged, commitlint, changesets, prettier
```

### Step 4 — Final verification

- `pnpm prePush` exits clean
- `pnpm -C mock dev` smokes (30s timeout, verify bot logs in)
- `pnpm docs:smoke` produces non-empty samples; diff against baseline (no unexpected drift)

---

## Acceptance Criteria

### Functional

- [ ] Workspace builds, types, lints, tests at 0 errors / 0 warnings
- [ ] `pnpm -C mock dev` smokes
- [ ] `pnpm docs:smoke` produces samples consistent with baseline
- [ ] CI green on the branch after push

### Code Quality

- [ ] No `// @ts-ignore` or `eslint-disable` added to suppress TS 6 / ESLint 10 errors (fix root cause)
- [ ] No `as any` introduced

### Publishing

- [ ] Changesets added for every published package: patch with body `"bump TS / typescript-eslint / ESLint / Vite peer ranges"`. Consumers using these as peer deps will need the new majors.

---

## Risks and Mitigation

| Risk                                                      | Mitigation                                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TS 6 narrow surfaces hundreds of errors                   | Don't bundle Block 1 + Block 2; one major at a time                                                                   |
| Vite 8 + Vitest mismatch                                  | Catalog bump them together; pin vitest exact version if needed                                                        |
| Lint config drift between flat-config and eslintrc-compat | TS-eco research says we're already flat-clean; verify with `grep -r eslintrc packages/eslint-config/src`              |
| Node 22.13 floor breaks user dev environments             | Document in changeset body; Node 22 LTS so should be safe ; verify with `grep -r eslintrc packages/eslint-config/src` |
| Node 22.13 floor breaks user dev environments             | Document in changeset body; Node 22 LTS so should be safe                                                             |

---

## Related TODOs

- Blocked by: TASK-02 (catalog must exist)
- Blocks: TASK-06 (devtools depend on lint majors), TASK-09/10/11 (quality fixes may use new TS 6 narrowing), TASK-12 (URL impl)

---

## Notes

- **Complexity:** High — TS major bump
- **Files affected:** workspace yaml, root + tsconfig + every package tsconfig + likely 10-30 source-level cascade fixes
- **Touches published packages:** Yes — peer dep range bump → changeset patch each
- **Estimated wall-clock:** 4-6 hours

---

## Handoff

- 2026-05-25 — completed by Claude Opus on sub-branch `chore/dep-bump-batch-01-05`. Block 1 PARTIAL first (`094909d8`: ts-eslint patches + drop @eslint/eslintrc) because ESLint 10 + TS 6 both blocked: ESLint 10 by `eslint-plugin-react@7.37.5` (no v8 compat release), TS 6 by `tsup@8.5.1`'s baseUrl injection (PR #1390 still open). After the tsdown migration (TASK-02.7, commit `0fd0585b`), TS 6 unblocked → commit `6f8f4d2d`. ESLint 10 stayed deferred. Remaining: `93b20e1d` (eslint-plugin-security 4), `3456f608` (vite 8 + vitest 4.1.7), `7f5f4e0a` (patch sweep), `36cecef0` (lint-staged 17), `8f853129` (commitlint 21). ESLint 10 deferred until `eslint-plugin-react` ships a compat release (track via `.vscode/notes/ECOSYSTEM_BLOCKERS_2026-05-24.md`).
