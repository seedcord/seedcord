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

## Notes

- **Complexity:** Low
- **Files affected:** 3-4
- **Touches published packages:** Yes (`@seedcord/eslint-config`) — changeset minor
- **Estimated wall-clock:** 30 min
