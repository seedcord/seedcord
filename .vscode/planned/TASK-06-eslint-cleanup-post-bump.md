# TODO 06: ESLint cleanup post-bump (was: add devtools)

## Overview

**Scope adjusted from original plan.** Original goal was to add `eslint-plugin-react-compiler` + `eslint-plugin-react-refresh` per cancrops. Per `.vscode/docs/DEP_RESEARCH_TS_ECO.md`:

- `eslint-plugin-react-compiler` is **still RC** (19.1.0-rc.2 in cancrops). Skip until stable.
- `eslint-plugin-react-refresh` is **Vite-only**; seedcord's apps/docs is Next.js — does not apply.

So this task pivots to: **post-ESLint-10 cleanup** — remove dead `@eslint/eslintrc` shim, confirm flat-config consistency across every package, and bring `packages/eslint-config` to a clean post-major state.

## Goals

1. **Delete `@eslint/eslintrc`** from `packages/eslint-config/package.json` (dead with ESLint 10).
2. **Confirm flat-config purity** — every `eslint.config.mjs` in the repo uses only flat APIs; no `FlatCompat` shim left over.
3. **Surface `typescript-eslint`'s new flat-config helper** if `packages/eslint-config` uses the legacy pattern.
4. **Document the holdouts** — note in DOCS_SYSTEM later that react-compiler is deferred until non-RC.

---

## Files to Change

### Files to MODIFY

| File                                                                       | Change                                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/eslint-config/package.json`                                      | remove `@eslint/eslintrc` from deps                                                                   |
| `pnpm-workspace.yaml`                                                      | remove `@eslint/eslintrc` from `lint` bucket                                                          |
| `packages/eslint-config/src/index.ts`                                      | confirm no `FlatCompat` import; remove if present                                                     |
| `packages/eslint-config/src/rules/general-rules.ts`, `typescript-rules.ts` | confirm flat-only                                                                                     |
| Per-package `eslint.config.mjs`                                            | confirm flat config (already uses `createConfig` from `@seedcord/eslint-config`); no expected changes |

### Files to CREATE

None.

---

## Implementation Approach

### Step 1 — Search for `eslintrc` references

```sh
rg -i "eslintrc|FlatCompat" packages/eslint-config/ -t ts -t mjs --files-with-matches
```

If any hits, plan removal per file.

### Step 2 — Remove dep

```sh
pnpm -C packages/eslint-config remove @eslint/eslintrc
# Then in workspace catalog:
# pnpm-workspace.yaml: remove the @eslint/eslintrc entry from lint bucket
pnpm install
```

### Step 3 — Confirm flat config compiles

```sh
pnpm -C packages/eslint-config build
pnpm -C packages/eslint-config tc
pnpm -C packages/eslint-config lint:fix
```

### Step 4 — Verify every dependent

```sh
pnpm -C packages/seedcord lint:fix
pnpm -C packages/services lint:fix
# ... every package
# Or just: pnpm lint:fix from root
```

### Step 5 — Commit

```sh
git add packages/eslint-config/package.json packages/eslint-config/src/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(eslint-config): drop @eslint/eslintrc shim (ESLint 10 makes it dead)"
```

Changeset: minor on `@seedcord/eslint-config` (devDep surface change for consumers).

---

## Acceptance Criteria

- [ ] `@eslint/eslintrc` is gone from `packages/eslint-config/package.json` and the workspace catalog
- [ ] `rg eslintrc packages/eslint-config/src` returns nothing
- [ ] `pnpm lint:fix` clean across every package
- [ ] Changeset added: minor on `@seedcord/eslint-config`

---

## Risks and Mitigation

| Risk                                                                       | Mitigation                                                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A consumer relies on the `eslintrc` shim through `@seedcord/eslint-config` | Already audited in TS-eco research — we're flat-clean. Confirm with grep before removing.                        |
| Removed dep affects a non-obvious transitive pinning                       | `pnpm install` will surface; if so, revert and investigate. we're flat-clean. Confirm with grep before removing. |
| Removed dep affects a non-obvious transitive pinning                       | `pnpm install` will surface; if so, revert and investigate.                                                      |

---

## Related TODOs

- Blocked by: TASK-03 (ESLint 10 bump)
- Blocks: nothing critical; quality of life

---

## Handoff

**Status:** ✅ Completed (2026-05-25)

```
Completed by: Claude Opus 4.7
Build status: ✅ pnpm prePush exit 0

### What was done:
- React-compiler RC ESLint plugin (19.1.0-rc.2) wired in apps/docs/eslint.config.mjs in a prior commit
  (chore/dep-bump-batch-01-05); user explicitly opted in despite the RC tag because the rules catch
  real correctness issues. One false positive surfaced + suppressed inline with justification.
- React-refresh ESLint plugin: stays N/A. apps/docs is Next.js (built-in Fast Refresh), not Vite.
- @eslint/eslintrc / FlatCompat cleanup: N/A. Audited every package — `rg -i "eslintrc|FlatCompat"` returns
  nothing in packages/eslint-config/src or any consumer eslint.config.mjs. The dep was never installed.

### Blockers encountered:
- ESLint 10 itself stays deferred — `eslint-plugin-react@7.37.5` still incompatible with ESLint 10's
  reorganized linter API. Sonnet subagent research (saved to .vscode/notes/ESLINT-10-PLUGIN-REACT-RESEARCH.md)
  confirmed the upstream fix PR (#3979) is open + CI-green but maintainer-bottlenecked on a separate
  ESLint-10 fix in eslint-plugin-import. No timeline signal — pessimistic Q3 2026 or later. Recommendation:
  keep waiting; do not fork or migrate to @eslint-react/eslint-plugin (rule names differ; significant cost).
- ESLint 10 cleanup checklist captured in .vscode/notes/ECOSYSTEM_BLOCKERS_2026-05-24.md for whoever
  finally lands the bump.

### Breaking changes:
- None.

### Files modified count: 0 (this commit) / 1 in prior commit (apps/docs/eslint.config.mjs)
### Files created count: 0
### Files deleted count: 0

### Key decisions made:
- Marked complete despite the pivoted "post-ESLint-10 cleanup" scope being inapplicable — the original
  goal (add devtools) is done; the pivot was contingent on ESLint 10 landing, which it didn't. Reopening
  this TODO when ESLint 10 lands would be reasonable; the cleanup checklist + research doc are the
  written handoff to that future work.

### Tests passing: ✅ via pnpm prePush

### Verification performed:
- rg eslintrc packages/eslint-config/src → no hits
- rg FlatCompat → no hits anywhere in src
- ESLint catalog confirmed at ^9.39.2 (no 10.x); cleanup gated on the deferred bump.

### Changeset added:
- N/A — no published-package surface change (no dep removed, no API change).

### Warnings to next implementor (whoever lands ESLint 10):
- Walk the checklist in .vscode/notes/ECOSYSTEM_BLOCKERS_2026-05-24.md ("ESLint 10 cleanup checklist for
  when the bump finally lands"). Specifically: bump peer.eslint in pnpm-workspace.yaml, bump
  eslint-plugin-react to its new compat version, accept peer warnings from jsx-a11y/import/prettier/
  react-hooks, run full pnpm prePush, add minor changeset on @seedcord/eslint-config.

### Critical notes:
- Squashed into feat/better-api-extraction as commit edc7e43.
```

---

## Notes

- **Complexity:** Low
- **Files affected:** 3-4
- **Touches published packages:** Yes (`@seedcord/eslint-config`) — changeset minor
- **Estimated wall-clock:** 30 min
