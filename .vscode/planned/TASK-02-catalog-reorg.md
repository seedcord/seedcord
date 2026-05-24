# TODO 02: Catalog reorg (cancrops-style buckets)

## Overview

Reorganize `pnpm-workspace.yaml` from the current flat `deps` + `peer` shape into the cancrops 7-bucket structure (`deps`, `react`, `frontend`, `testing`, `lint`, `build`, `peer`). Migrate currently-pinned versions into the correct buckets. **No version changes yet** — bumps live in 03/04/05.

## Goals

1. **Bucket organization:** Workspace catalog matches cancrops's named-bucket layout. Easier to scan, fewer cross-package version drifts.
2. **Migrate uncatalogued deps:** Currently scattered across each `package.json` (`@radix-ui/*`, `@typescript-eslint/*`, `typedoc-plugin-*`, `winston`, drivers, build tools) get pulled into the appropriate catalog bucket and referenced as `catalog:<bucket>` from each consumer.
3. **No behavior changes:** Versions stay where they are. `pnpm install --frozen-lockfile` after the reorg is the success criterion.

---

## Reasoning

### Why bucketed catalogs?

**Current problems:**

- Same dep version pinned in multiple `package.json` files (e.g. `@radix-ui/*`, `@typescript-eslint/*`, `typedoc-plugin-*`)
- Drift risk: bumping in one package without others
- One flat `deps` bucket conflates unrelated concerns (Discord runtime + Tailwind + Vitest)

**Solution:**

- Adopt the cancrops scheme: `deps` (cross-cutting / domain), `react`, `frontend` (UI deps), `testing`, `lint` (ESLint + plugins + prettier plugins), `build` (tsup, vite, plugins), `peer` (peer-only: eslint, typescript, tsup, tsx)
- Reference all repeated deps as `catalog:<bucket>` from package.json

### Why no version changes here?

**Reasoning:** Reorg + bump in the same task is unreviewable. Land reorg green first, then per-bucket bumps land as isolated diffs that show "what changed when".

---

## Files to Change

### Files to MODIFY

1. `pnpm-workspace.yaml` — **MAJOR** — new bucket structure, every cross-package dep promoted
2. `package.json` (root) — **MINOR** — devDeps switch to `catalog:<bucket>` where applicable
3. `packages/cli/package.json` — **MINOR** — `commander`, `@commander-js/extra-typings`, `ink`, `ink-spinner`, `jiti`, `minimatch` → catalog
4. `packages/services/package.json` — **MINOR** — `winston`, `winston-transport`, `strip-ansi` → catalog
5. `packages/plugins/package.json` — **MINOR** — `pg`, `@types/pg`, `kysely` → catalog
6. `packages/eslint-config/package.json` — **MINOR** — `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `typescript-eslint`, `eslint-import-resolver-typescript`, `eslint-plugin-import`, `eslint-plugin-prettier`, `eslint-plugin-security`, `eslint-plugin-tsdoc`, `eslint-config-prettier`, `lodash.merge` → catalog
7. `packages/docs-engine/package.json` — **MINOR** — `@leeoniya/ufuzzy`, `typedoc-plugin-dt-links`, `typedoc-plugin-mdn-links` → catalog
8. `packages/docs-generator/package.json` — **MINOR** — same typedoc-plugins → catalog
9. `apps/docs/package.json` — **MINOR** — every `@radix-ui/*`, `clsx`, `tailwind-merge`, `cmdk`, `lucide-react`, `marked`, `next`, `next-themes`, `postcss`, `shiki`, `tailwindcss`, `@tailwindcss/postcss`, `zustand` → catalog (mostly `frontend`, some `react`)
10. `mock/package.json` — **MINOR** — no new entries (already uses catalog)

### Files to CREATE

None.

---

## Implementation Approach

### Step 1 — Draft new `pnpm-workspace.yaml`

Use the structure below. Versions are pulled from current `package.json` files; **DO NOT bump anything yet**. (Bumps land in TASKS 03/04/05.)

```yaml
packages:
    - mock
    - packages/*
    - apps/*

catalogs:
    deps:
        # Cross-cutting / runtime (discord, framework, env)
        chalk: 5.6.2
        discord.js: 14.25.1
        envapt: 4.1.0
        mongoose: 9.0.2
        reflect-metadata: 0.2.2
        type-fest: 5.3.1
        winston: 3.19.0
        winston-transport: 4.9.0
        strip-ansi: 7.1.2

    cli:
        # CLI / Ink runtime
        '@commander-js/extra-typings': 14.0.0
        commander: 14.0.2
        ink: 6.6.0
        ink-spinner: 5.0.0
        jiti: 2.6.1
        minimatch: 10.1.1
        fix-esm-import-path: 1.10.3

    drivers:
        # Database driver / query builders
        pg: 8.16.3
        '@types/pg': 8.16.0
        kysely: 0.28.9

    react:
        # React-* family + types
        react: 19.2.3
        react-dom: 19.2.3
        '@types/react': 19.2.7
        '@types/react-dom': 19.2.3

    frontend:
        # UI deps used by apps/docs (and future apps/guide, apps/home)
        '@radix-ui/react-dialog': 1.1.15
        '@radix-ui/react-dropdown-menu': 2.1.16
        '@radix-ui/react-popover': 1.1.15
        '@radix-ui/react-slot': 1.2.4
        '@radix-ui/react-tooltip': 1.2.8
        clsx: 2.1.1
        tailwind-merge: 3.4.0
        cmdk: 1.1.1
        lucide-react: 0.562.0
        marked: 17.0.1
        next: 16.1.0
        next-themes: 0.4.6
        postcss: 8.5.6
        shiki: 3.20.0
        tailwindcss: 4.1.18
        '@tailwindcss/postcss': 4.1.18
        prettier-plugin-tailwindcss: 0.7.2
        zustand: 5.0.9
        eslint-config-next: 16.1.0
        eslint-plugin-jsx-a11y: 6.10.2

    docs:
        # Docs tooling (typedoc + plugins + search)
        typedoc: 0.28.15
        typedoc-plugin-dt-links: 2.0.34
        typedoc-plugin-mdn-links: 5.0.10
        '@leeoniya/ufuzzy': 1.0.19

    testing:
        # Vitest + helpers + @types/chai + chai (workspace test deps)
        vitest: 4.0.13
        '@vitest/coverage-v8': 4.0.13
        chai: 6.2.1
        '@types/chai': 5.2.3
        tsd: 0.33.0
        nodemon: 3.1.11

    lint:
        # ESLint + plugins + prettier (consumed by packages/eslint-config + dependents)
        eslint-config-prettier: 10.1.8
        eslint-import-resolver-typescript: 4.4.4
        eslint-plugin-import: 2.32.0
        eslint-plugin-prettier: 5.5.4
        eslint-plugin-security: 3.0.1
        eslint-plugin-tsdoc: 0.5.0
        eslint-plugin-react: 7.37.5
        eslint-plugin-react-hooks: 7.0.1
        '@typescript-eslint/eslint-plugin': 8.50.0
        '@typescript-eslint/parser': 8.50.0
        typescript-eslint: 8.50.0
        '@types/eslint-plugin-security': 3.0.0
        '@eslint/eslintrc': 3.3.3
        lodash.merge: 4.6.2
        '@types/lodash.merge': 4.6.9
        prettier: 3.7.4
        '@commitlint/cli': 20.1.0
        '@commitlint/config-conventional': 20.0.0
        '@changesets/cli': 2.29.7
        husky: 9.1.7
        lint-staged: 16.2.7
        turbo: 2.6.1

    build:
        # Build toolchain (Tailwind plugin, swc, vite)
        '@swc/core': 1.15.3
        vite: 7.3.0

    peer:
        eslint: 9.39.2
        typescript: 5.9.3
        tsup: 8.5.1
        tsx: 4.20.6

onlyBuiltDependencies:
    - '@swc/core'
    - '@tailwindcss/oxide'
    - esbuild
    - sharp
    - unrs-resolver
```

> Notes:
>
> - Added 3 new buckets vs cancrops: `cli` (commander/ink), `drivers` (pg/kysely), `docs` (typedoc + plugins). Cancrops doesn't have these because it's e-commerce. Seedcord needs them.
> - `prettier` lives under `lint` (cancrops puts it there too).
> - `prettier-plugin-tailwindcss` under `frontend` (it's a Tailwind concern).
> - `lucide-react` 0.562 — staying at current; bump to 1.x is its own task (TASK-04).
> - `pnpm-workspace.yaml` allows multiple catalogs; pnpm resolves `catalog:<name>` per the bucket key.

### Step 2 — Update every `package.json` to use `catalog:<bucket>`

For each file in the modify list, replace literal version specs with `catalog:<bucket>` references. Example for `packages/cli/package.json`:

```diff
- "@commander-js/extra-typings": "^14.0.0",
- "commander": "^14.0.2",
- "ink": "^6.6.0",
- "ink-spinner": "^5.0.0",
- "jiti": "^2.6.1",
- "minimatch": "^10.1.1",
+ "@commander-js/extra-typings": "catalog:cli",
+ "commander": "catalog:cli",
+ "ink": "catalog:cli",
+ "ink-spinner": "catalog:cli",
+ "jiti": "catalog:cli",
+ "minimatch": "catalog:cli",
```

Apply the same pattern across every `package.json` in the Modify list.

### Step 3 — Reinstall

```sh
pnpm install
```

Lockfile updates with the catalog references resolved. `pnpm-lock.yaml` content should be functionally identical (same resolved versions) — diff to verify.

### Step 4 — Verify gates

```sh
pnpm tc
pnpm lint:fix
pnpm test
pnpm build
```

All should pass. If any fail, the failure is either pre-existing (per TASK-01 baseline) or a missed catalog reference (revert + fix).

### Step 5 — Commit

```sh
git add pnpm-workspace.yaml package.json packages/*/package.json apps/*/package.json mock/package.json pnpm-lock.yaml
git commit -m "chore(deps): reorganize pnpm-workspace catalogs into named buckets"
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] `pnpm-workspace.yaml` has 9 buckets (`deps`, `cli`, `drivers`, `react`, `frontend`, `docs`, `testing`, `lint`, `build`, `peer`) — count includes `peer`
- [ ] Every `package.json` dep that appears in 2+ packages is referenced as `catalog:<bucket>`, never a literal version
- [ ] `pnpm install` reports no resolution failures
- [ ] `pnpm prePush` exits clean

### Code Quality

- [ ] No code changes in `src/**` of any package
- [ ] No version numbers changed from current pins

### Publishing

- [ ] No changeset needed (catalog reorg doesn't affect published API)

---

## Testing Requirements

### Validation

- `pnpm install --frozen-lockfile` after commit succeeds on a fresh clone
- `pnpm list --recursive --depth=0 --json` resolves every catalog reference

---

## Migration Notes

### For task implementor

1. Generate the diff of every `package.json` first; review for missed deps before running `pnpm install`
2. If lockfile resolution surfaces a dep that should be catalogued but isn't yet, add it to the appropriate bucket and re-run
3. Don't bump any version; this task is reorg-only

---

## Risks and Mitigation

| Risk                                                            | Mitigation                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Missed dep in catalog → lockfile bloats with duplicate versions | `pnpm dedupe` after install; investigate any duplicates                                                                 |
| pnpm catalog parsing differs across versions                    | Confirm pnpm 10.26.1 (current) supports multi-bucket catalogs (it does; cancrops uses the same setup on identical pnpm) |
| Per-package devDeps using `^X.Y.Z` differs from catalog pin     | Catalog is authoritative; per-package ^ ranges become catalog references                                                |
| ---                                                             | ---                                                                                                                     |
| Missed dep in catalog → lockfile bloats with duplicate versions | `pnpm dedupe` after install; investigate any duplicates                                                                 |
| pnpm catalog parsing differs across versions                    | Confirm pnpm 10.26.1 (current) supports multi-bucket catalogs (it does; cancrops uses the same setup on identical pnpm) |
| Per-package devDeps using `^X.Y.Z` differs from catalog pin     | Catalog is authoritative; per-package ^ ranges become catalog references                                                |

---

## Related TODOs

- Blocks: 03 (TS bump), 04 (frontend bump), 05 (domain bump), 06 (devtools)
- Unblocks Phase 1's parallelism — once catalog exists, the three bumps can proceed in parallel branches.

---

## Notes

- **Complexity:** Medium (touches every `package.json`)
- **Files affected:** ~12 package.json files + workspace yaml + lockfile
- **Touches published packages:** No (devDeps + dependencies syntax change only; resolved versions unchanged)
- **Estimated wall-clock:** 1-2 hours
