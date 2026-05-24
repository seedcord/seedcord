# TS Ecosystem — Dep Bump Research

**Researched:** 2026-05-24
**Researcher:** Claude (Opus 4.7)
**Policy:** chase latest stable, skip if security advisory > MEDIUM in latest; cancrops May-2026 pins are known-good baselines but do not cap us.
**Sources:** Versions verified against `https://registry.npmjs.org/<pkg>/latest` (npm). Breaking-change claims cite official release notes / migration guides.

## Summary Table

| package                           | current       | latest stable | recommended bump       | major bump?                | security                                               |
| --------------------------------- | ------------- | ------------- | ---------------------- | -------------------------- | ------------------------------------------------------ |
| typescript                        | 5.9.3         | 6.0.3         | 6.0.3                  | YES (5 → 6)                | none                                                   |
| typescript-eslint                 | ^8.50.0       | 8.59.4        | ^8.59.4                | no                         | none                                                   |
| @typescript-eslint/eslint-plugin  | ^8.50.0       | 8.59.4        | ^8.59.4                | no                         | none                                                   |
| @typescript-eslint/parser         | ^8.50.0       | 8.59.4        | ^8.59.4                | no                         | none                                                   |
| eslint                            | 9.39.2        | 10.4.0        | 10.4.0                 | YES (9 → 10)               | none                                                   |
| eslint-config-prettier            | ^10.1.8       | 10.1.8        | ^10.1.8                | no (no change)             | none                                                   |
| eslint-import-resolver-typescript | ^4.4.4        | 4.4.4         | ^4.4.4                 | no                         | none                                                   |
| eslint-plugin-import              | ^2.32.0       | 2.32.0        | ^2.32.0                | no (no change)             | none                                                   |
| eslint-plugin-prettier            | ^5.5.4        | 5.5.5         | ^5.5.5                 | no (patch)                 | none                                                   |
| eslint-plugin-security            | ^3.0.1        | 4.0.0         | 4.0.0                  | YES (3 → 4)                | none (this is the security plugin itself)              |
| eslint-plugin-tsdoc               | ^0.5.0        | 0.5.2         | ^0.5.2                 | no                         | none                                                   |
| eslint-plugin-jsx-a11y            | ^6.10.2       | 6.10.2        | ^6.10.2                | no                         | none                                                   |
| eslint-plugin-react               | ^7.37.5       | 7.37.5        | ^7.37.5                | no                         | none                                                   |
| eslint-plugin-react-hooks         | ^7.0.1        | 7.1.1         | ^7.1.1                 | no (minor)                 | none                                                   |
| eslint-plugin-react-compiler      | not installed | 19.1.0-rc.2   | 19.1.0-rc.2            | new install                | none (rc — wait if risk-averse)                        |
| eslint-plugin-react-refresh       | not installed | 0.5.2         | 0.5.2                  | new install                | none                                                   |
| prettier                          | 3.7.4         | 3.8.3         | 3.8.3                  | no (minor)                 | none                                                   |
| prettier-plugin-tailwindcss       | ^0.7.2        | 0.8.0         | ^0.8.0                 | minor — has breaking notes | none                                                   |
| vite                              | 7.3.0         | 8.0.14        | 8.0.14                 | YES (7 → 8)                | none                                                   |
| @vitejs/plugin-react              | not direct    | 6.0.2         | 6.0.2 (if/when needed) | new (Vite 8 requires v6)   | none                                                   |
| tsup                              | 8.5.1         | 8.5.1         | hold                   | no                         | none                                                   |
| tsx                               | 4.20.6        | 4.22.3        | ^4.22.3                | no                         | none                                                   |
| vitest                            | ^4.0.13       | 4.1.7         | ^4.1.7                 | no (minor)                 | none                                                   |
| @vitest/coverage-v8               | ^4.0.13       | 4.1.7         | ^4.1.7                 | no                         | none                                                   |
| @swc/core                         | ^1.15.3       | 1.15.40       | ^1.15.40               | no                         | none                                                   |
| turbo                             | ^2.6.1        | 2.9.14        | ^2.9.14                | no                         | none                                                   |
| husky                             | ^9.1.7        | 9.1.7         | hold                   | no                         | none                                                   |
| lint-staged                       | ^16.2.7       | 17.0.5        | 17.0.5                 | YES (16 → 17)              | none                                                   |
| @commitlint/cli                   | ^20.1.0       | 21.0.1        | ^21.0.1                | YES (20 → 21)              | none                                                   |
| @commitlint/config-conventional   | ^20.0.0       | 21.0.1        | ^21.0.1                | YES (20 → 21)              | none                                                   |
| @changesets/cli                   | ^2.29.7       | 2.31.0        | ^2.31.0                | no                         | none                                                   |
| @eslint/eslintrc                  | ^3.3.3        | 3.3.5         | ^3.3.5                 | no                         | none — but consider removal under ESLint 10            |
| chai                              | ^6.2.1        | 6.2.2         | ^6.2.2                 | no                         | none                                                   |
| @types/chai                       | ^5.2.3        | 5.2.3         | ^5.2.3                 | no                         | none                                                   |
| @types/node                       | ^24.10.1      | 25.9.1        | depends on Node engine | possibly                   | none (but tracks Node major)                           |
| nodemon                           | ^3.1.11       | 3.1.14        | ^3.1.14                | no                         | none                                                   |
| tsd                               | ^0.33.0       | 0.33.0        | hold                   | no                         | none                                                   |
| lodash.merge                      | ^4.6.2        | 4.6.2         | hold                   | no                         | none — package itself unmaintained, consider replacing |
| @types/lodash.merge               | ^4.6.9        | 4.6.9         | hold                   | no                         | none                                                   |

## Sequencing — must bump together

1. **TypeScript 6 + typescript-eslint 8.59.x + ESLint 10**
    - TS 6 was released ~Mar 2026. `typescript-eslint` 8.59.x has landed the AST changes needed (JSX `</` token split, `target: "es5"` deprecation handling) per their TS 6 tracking issue. Stay on the same `8.x` major; do not jump to a `9.x` rc unless one exists.
    - ESLint 10 requires Node ≥ 20.19 / 22.13 / 24+. seedcord's `engines.node` is `>=22.12.0`; **bump engines to `>=22.13.0`** to satisfy ESLint 10. (Root `package.json` engines block.)
    - All three must land in the same PR because:
        - `tseslint.configs.recommendedTypeChecked` resolves rules against the installed TS version.
        - Root + per-package `eslint.config.mjs` files (13 total) extend `@seedcord/eslint-config` which transitively pulls `typescript-eslint`.
        - ESLint 10 drops the legacy eslintrc loader — `@eslint/eslintrc` in `packages/eslint-config/package.json` becomes dead code (currently unused; safe to remove).

2. **Vite 8 + @vitejs/plugin-react 6 + Vitest 4.1.7**
    - Vite 8 (Rolldown) requires `@vitejs/plugin-react ≥ 6` (Babel no longer bundled).
    - Vitest 4.1.1+ explicitly drops Vite 8.beta but supports Vite 8 stable; **4.1.7 is the safe target**.
    - seedcord does **not** use Vite directly for app builds (the docs app is Next 16; only `vite` is referenced in `pnpm-workspace.yaml` catalog and via `vitest`). The catalog `vite: 7.3.0` is consumed by `vitest`. Bumping vitest to 4.1.7 will let it work with whatever vite the workspace pins; you can either:
        - Bump catalog `vite` to 8.0.14 and `vitest` to 4.1.7 together, OR
        - Leave catalog `vite` at 7.3.0 — vitest 4.1.7 still supports Vite 7. Recommended path: bump both since there's no consumer that cares about Vite 7 specifics.
    - `@vitejs/plugin-react` is **not currently installed**. Do not add it unless you actually need React + Vite (apps/docs uses Next 16, not Vite-React).

3. **React-\* ESLint plugins (only if you switch the docs app's react tooling)**
    - apps/docs currently uses `eslint-config-next` (Next 16) for React linting. `eslint-plugin-react` and `eslint-plugin-react-hooks` are pulled transitively.
    - `eslint-plugin-react-compiler@19.1.0-rc.2` is still an RC — only add if you adopt React Compiler in apps/docs. Cancrops has it; we don't yet.
    - `eslint-plugin-react-refresh@0.5.2` is **for Vite-React projects** (it warns about non-component exports in HMR-tracked files). Next has its own Fast Refresh — **do not install** for apps/docs.

4. **lint-staged 17 + commitlint 21 + husky 9**
    - lint-staged 17 requires git ≥ 2.32 (released 2021 — fine on any modern dev machine).
    - commitlint 21 requires Node ≥ 22 (matches seedcord engines after the ESLint-10-driven bump to 22.13).
    - husky 9 has no breaking changes here; no bump needed (latest = current).

5. **Prettier 3.8.3 + prettier-plugin-tailwindcss 0.8.0**
    - plugin 0.8.0 requires Prettier ≥ 3.7 (we're already past). Safe pairing.
    - Only used by apps/docs (`prettier-plugin-tailwindcss`). Bump together.

6. **chai 6.2.x + @types/chai 5.2.x**
    - chai 6.2.2 is a patch over current 6.2.1 — trivial bump, no breaking changes since v6.0 ESM/import-mutation rework.
    - `@types/chai` lagging at major 5 is expected (DefinitelyTyped major often trails source); current is fine.

## Detailed migration — major bumps only

### TypeScript 5.9 → 6.0 (MAJOR)

**Release context:** TypeScript 6.0 (Mar 2026) is the last JavaScript-based compiler; TS 7 is the Go rewrite. 6.0 ships breaking changes around defaults, module systems, and lib targets.

Sources:

- <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>
- <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>

**Breaking changes that affect seedcord:**

1. **`moduleResolution: "classic"` removed.** seedcord uses `"moduleResolution": "bundler"` in `packages/tsconfig/base.json` — **not affected**.
2. **`module` values "amd", "umd", "systemjs", "none" removed.** seedcord uses `"module": "esnext"` — **not affected**.
3. **`esModuleInterop` / `allowSyntheticDefaultImports` can no longer be set to `false`.** seedcord's `packages/tsconfig/base.json` has `"esModuleInterop": false` and `"allowSyntheticDefaultImports": true`. **This will break the build.** Need to set `esModuleInterop: true` (or remove the explicit `false`). This may surface import-shape mismatches in any code doing `import x from 'cjs-mod'` style imports that previously relied on the synthetic-only path.
4. **`target` default changed to ES2023; ES3/ES5 deprecated.** seedcord uses `"target": "ESNext"` — **not affected**.
5. **`types` no longer auto-pulls all `@types/*`.** If any seedcord package was implicitly relying on global `@types/node` types being included without listing them in `types: []`, type-checking may break. seedcord's base config does not set `types`, so the new default `[]` will apply. **Action:** add `"types": ["node"]` (or `["node", "vitest/globals"]` per-package) where needed.
6. **All code assumed strict-mode; `"use strict"` always emitted in non-ESM.** seedcord packages are `"type": "module"` everywhere — **not affected**.
7. **`downlevelIteration` deprecated.** Not used.

**Required code changes:**

- `packages/tsconfig/base.json` — set `esModuleInterop: true`, drop or keep `allowSyntheticDefaultImports: true` (still allowed).
- Audit `import x from 'foo'` usages of CJS-only deps after the interop flip. Run `pnpm tc` and fix any new `TS2613` / `TS1192` errors. Likely small.
- `packages/tsconfig/base.json` — add `"types": ["node"]` if `pnpm tc` reports `Cannot find name 'process'` etc. (Per-package `tsconfig.json` may also need `"types": ["node", "vitest/globals"]` in test-bearing packages.)
- Any package that imports `vitest/globals` ambiently (without listing in `types`) — list it explicitly.

**Config changes:**

- `packages/tsconfig/base.json`:
    - `"esModuleInterop": true`
    - `"types": ["node"]` (probably)
- Per-package overrides only where needed.

**Sequencing notes:**

- Bump `typescript`, `typescript-eslint` (8.59.x), and run a full `pnpm tc && pnpm lint && pnpm test` in the same PR.
- Do **not** bump TS 6 without also re-running `tsd` (0.33.0) — it pins its own TS internally so should be fine, but watch for `tsd` errors in `packages/seedcord`.

---

### ESLint 9 → 10 (MAJOR)

**Release context:** ESLint 10 (Feb 2026) finalizes flat config and drops legacy eslintrc entirely.

Sources:

- <https://eslint.org/blog/2026/02/eslint-v10.0.0-released/>
- <https://eslint.org/docs/latest/use/migrate-to-10.0.0>

**Breaking changes that affect seedcord:**

1. **Legacy `.eslintrc.*` is silently ignored.** seedcord already uses flat config (`eslint.config.mjs` in all 13 locations). **Not affected.**
2. **Node ≥ 20.19 / 22.13 / 24+ required.** seedcord's `engines.node` is `>=22.12.0`. **Bump to `>=22.13.0`** in root `package.json`.
3. **Config lookup starts from the linted file's directory, not cwd.** Monorepo-friendly; seedcord's per-package `eslint.config.mjs` all call `createConfig({ tsconfigRootDir: import.meta.dirname })`, so this is a **net win** — no change needed.
4. **JSX reference tracking added.** Only affects apps/docs (the only JSX/TSX in the repo). If `no-unused-vars` was hand-disabled for JSX, you can re-enable it. Optional cleanup, not blocking.
5. **`@eslint/eslintrc` shim package becomes orphaned.** seedcord lists it as a dependency in `packages/eslint-config/package.json` but `src/index.ts` does **not import it** — verified by grep. Remove it.

**Required code changes:**

- Root `package.json` — `"engines": { "node": ">=22.13.0" }`.
- `packages/eslint-config/package.json` — remove `"@eslint/eslintrc": "^3.3.5"` from `dependencies` (verified unused).

**Config changes:**

- None to flat configs — seedcord's flat config files are already compliant.

**Sequencing notes:**

- Bump `eslint` to 10.4.0, `typescript-eslint` to 8.59.4, and TS to 6.0.3 together. Run `pnpm lint` across the monorepo; expect zero rule-level breakage (8.59.x is API-compatible with ESLint 9 and 10).

---

### Vite 7 → 8 (MAJOR — but **low impact** for seedcord)

**Release context:** Vite 8 (Mar 2026) replaces the dual esbuild+Rollup backend with Rolldown (Rust).

Sources:

- <https://vite.dev/guide/migration>
- <https://vite.dev/blog/announcing-vite8>

**seedcord usage of Vite:** Vite is in the workspace catalog (`pnpm-workspace.yaml` → `vite: 7.3.0`) but **no package imports `vite` directly for app bundling**. The only consumers are `vitest` (which bundles its own Vite) and any future Vite-based apps. apps/docs is Next 16, not Vite.

**Breaking changes that affect seedcord:**

- **CJS interop change:** default import from CJS module now returns `module.exports` directly. Could affect any `vitest.config.ts` that does `import x from 'cjs-pkg'`. seedcord's vitest configs are minimal — quick visual audit needed.
- **`build.rollupOptions` → `build.rolldownOptions`:** there is a compat layer; old key still works with a warning. No seedcord config sets this.
- **Lightning CSS default for minification:** not used by seedcord (no Vite-built CSS pipeline).
- **HMR `import.meta.hot.accept(url)` removed:** not used.
- **`browser`/`module` field resolution heuristic dropped:** could in theory affect resolving any package with both fields. seedcord's deps are mostly ESM-first; risk is low.

**Required code changes:** none expected.

**Config changes:** none (no `vite.config.ts` exists in the repo — verified: `find . -name "vite.config.ts" -not -path "*/node_modules/*"` returns nothing; vitest configs are separate).

**Sequencing notes:**

- Bump catalog `vite` to 8.0.14 **together with** vitest 4.1.7 (4.1.7 supports Vite 8 stable). Verify `pnpm test` across all packages.
- If you later add a Vite-React app, install `@vitejs/plugin-react@6.0.2` and configure Babel separately via `@rolldown/plugin-babel` if you need Babel plugins.

---

### eslint-plugin-security 3 → 4 (MAJOR)

**Release context:** v4 dropped older Node and tightened rule defaults. Some community criticism that the plugin is under-maintained (see Ofri Peretz's posts), but no security advisory against the plugin itself.

Sources:

- <https://github.com/eslint-community/eslint-plugin-security/releases>
- <https://github.com/eslint-community/eslint-plugin-security/blob/main/CHANGELOG.md>

**Breaking changes that affect seedcord:**

- Node requirement bumped (matches our floor).
- Some rule defaults adjusted in `recommended`.
- `packages/eslint-config/src/index.ts` does `merge({}, eslintSecurity.configs.recommended.rules)` then re-applies on top with `SECURITY_RULES` from `./rules`. The shape of `configs.recommended` has not changed in v4 (still an array of flat-config objects with `.rules`), so the merge call should keep working.

**Required code changes:**

- After bump, run `pnpm lint` from repo root. Resolve any new warnings/errors from the tightened recommended set, or add explicit overrides in `packages/eslint-config/src/rules/security.ts` (if that file exists; otherwise inline in `index.ts`).

**Config changes:** none structural.

**Sequencing notes:** independent of other bumps; can land in any order.

---

### lint-staged 16 → 17 (MAJOR)

**Release context:** v17 enforces git ≥ 2.32 and switched git-staging strategy.

Sources:

- <https://github.com/lint-staged/lint-staged/releases>

**Breaking changes that affect seedcord:**

- **Git ≥ 2.32 required.** Any dev still on git 2.31 or older needs to upgrade. Not a runtime concern; document in `CONTRIBUTING` if you have one.
- **`yaml` is now an optional dep.** seedcord's lint-staged config is in root `package.json` (`lint-staged` field is JSON inline) — **not affected**.
- **`git update-index --again`** is used post-task. Lower chance of stash/restore issues; net positive.
- **`--hide-all` flag added** (non-breaking, just available).

**Required code changes:** none.

**Config changes:** none.

**Sequencing notes:** independent. Land alone or with husky 9 (which is already at latest).

---

### commitlint 20 → 21 (MAJOR)

**Release context:** v21 raises Node floor to 22 and continues the pure-ESM migration.

Sources:

- <https://github.com/conventional-changelog/commitlint/releases>
- <https://commitlint.js.org/support/upgrade.html>

**Breaking changes that affect seedcord:**

- **Node ≥ 22 required.** Matches our floor after the ESLint-10 engines bump.
- **Pure ESM.** seedcord root `package.json` is `"type": "module"` — **not affected**.
- `@commitlint/config-conventional` must match cli major. Bump both together.

**Required code changes:** none.

**Config changes:** ensure `commitlint.config.*` (if present) uses `export default` not `module.exports`. Check the repo for that file.

**Sequencing notes:** bump cli + config-conventional in the same commit; otherwise peer-dep warnings.

---

### prettier-plugin-tailwindcss 0.7 → 0.8 (MINOR with breaking notes)

**Release context:** 0.8.0 removed top-level await, optimized caching, tightened plugin detection.

Sources:

- <https://github.com/tailwindlabs/prettier-plugin-tailwindcss/releases>

**Breaking changes that affect seedcord:**

- Requires Prettier ≥ 3.7 — we're at 3.7.4, soon to be 3.8.3. Safe.
- Public sorting API moved to `prettier-plugin-tailwindcss/sorter`. seedcord doesn't consume that API directly — **not affected**.
- Loads v3/v4 modules only when needed; we're on Tailwind v4 (`@tailwindcss/postcss ^4.1.18` in apps/docs) — should auto-detect.

**Required code changes:** none.

**Config changes:** verify `prettier.config.mjs` lists `prettier-plugin-tailwindcss` — bump and run `pnpm fmt:check` to confirm output is stable.

---

### chai 6.2.1 → 6.2.2 (PATCH, no breaking)

Already-on-major-6 patch. ESM-only, no `require()`, immutable `*` import object (already established in v6.0/v6.1). No action needed beyond bumping.

---

### @types/node 24 → 25 (TIES TO NODE RUNTIME)

`@types/*` packages do not follow semver. The `@types/node` major **should match the Node major you actually run**. seedcord engines target `>=22.12.0` → keep `@types/node` at major `24` (which covers Node 22–24 APIs well via DefinitelyTyped's overlap convention) OR jump to `25` if/when you bump engines to Node 25.

**Recommendation:** since the planned engine bump is `>=22.13.0` (for ESLint 10), **stay on `@types/node@^24`**. Move to `25` only after the runtime is verified on Node 25 in CI.

---

## Notes on cancrops vs seedcord version drift

| package                      | cancrops    | seedcord recommended | notes                                                                           |
| ---------------------------- | ----------- | -------------------- | ------------------------------------------------------------------------------- |
| typescript                   | 6.0.3       | 6.0.3                | match                                                                           |
| eslint                       | 9.39.2      | 10.4.0               | **chase past cancrops** — ESLint 10 is stable and seedcord is flat-config-ready |
| prettier                     | 3.8.3       | 3.8.3                | match                                                                           |
| vite                         | 8.0.13      | 8.0.14               | chase patch                                                                     |
| vitest                       | 4.1.6       | 4.1.7                | chase patch                                                                     |
| tsx                          | 4.22.2      | 4.22.3               | chase patch                                                                     |
| prettier-plugin-tailwindcss  | 0.8.0       | 0.8.0                | match                                                                           |
| eslint-plugin-react-hooks    | 7.1.1       | 7.1.1                | match (we were behind at 7.0.1)                                                 |
| eslint-plugin-react-compiler | 19.1.0-rc.2 | **skip for now**     | RC; not needed until React Compiler is adopted in apps/docs                     |
| eslint-plugin-react-refresh  | 0.5.2       | **skip**             | Vite-React only; apps/docs is Next                                              |
| @vitejs/plugin-react         | 6.0.2       | **skip**             | no Vite-React app in seedcord                                                   |
| vitest                       | 4.1.6       | 4.1.7                | chase patch                                                                     |
| tsx                          | 4.22.2      | 4.22.3               | chase patch                                                                     |
| prettier-plugin-tailwindcss  | 0.8.0       | 0.8.0                | match                                                                           |
| eslint-plugin-react-hooks    | 7.1.1       | 7.1.1                | match (we were behind at 7.0.1)                                                 |
| eslint-plugin-react-compiler | 19.1.0-rc.2 | **skip for now**     | RC; not needed until React Compiler is adopted in apps/docs                     |
| eslint-plugin-react-refresh  | 0.5.2       | **skip**             | Vite-React only; apps/docs is Next                                              |
| @vitejs/plugin-react         | 6.0.2       | **skip**             | no Vite-React app in seedcord                                                   |

**Headline drift:** seedcord lags meaningfully on `typescript` (5.9 → 6), `eslint` (9 → 10), `vite` (7 → 8), `prettier` (3.7 → 3.8), and `lint-staged`/`commitlint` majors. The TS/ESLint/Vite trio is the dominant blocker — they're tightly coupled and should land as one PR.

## Security advisories found

None at the `latest` of any package researched. `eslint-plugin-security@4.0.0` has community concerns about under-maintenance (see Ofri Peretz's writeups linked in the search results) but no CVE; safe to bump. `lodash.merge@4.6.2` is technically unmaintained at the source level (lodash split packages frozen) but has no open CVE; consider replacing with a tiny hand-rolled merge or `defu`/`deepmerge` in a follow-up cleanup, not as part of this bump.

---

## Source links (consolidated)

- TypeScript 6.0: <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/> , <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- typescript-eslint TS 6 tracking: <https://github.com/typescript-eslint/typescript-eslint/issues/12123>
- typescript-eslint releases: <https://github.com/typescript-eslint/typescript-eslint/releases>
- ESLint 10: <https://eslint.org/blog/2026/02/eslint-v10.0.0-released/> , <https://eslint.org/docs/latest/use/migrate-to-10.0.0>
- Vite 8: <https://vite.dev/blog/announcing-vite8> , <https://vite.dev/guide/migration>
- Vitest 4 / 4.1: <https://vitest.dev/blog/vitest-4> , <https://vitest.dev/blog/vitest-4-1.html>
- @vitejs/plugin-react 6 changelog: <https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md>
- eslint-plugin-security 4: <https://github.com/eslint-community/eslint-plugin-security/releases>
- lint-staged 17: <https://github.com/lint-staged/lint-staged/releases>
- commitlint upgrade guide: <https://commitlint.js.org/support/upgrade.html>
- prettier-plugin-tailwindcss 0.8: <https://github.com/tailwindlabs/prettier-plugin-tailwindcss/releases>
- chai v6 release: <https://github.com/chaijs/chai/releases/tag/v5.0.0> (ESM-only baseline, applies to v6 too)
- turbo releases: <https://github.com/vercel/turborepo/releases>
