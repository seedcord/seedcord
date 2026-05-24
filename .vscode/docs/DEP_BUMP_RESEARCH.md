# Dep Bump Research — Cross-Cutting Synthesis

**Date:** 2026-05-24
**Policy:** Chase latest stable across every dep, skip if a security advisory ≥ MEDIUM exists on the target version. Stay on the recent-but-not-bleeding-edge release (avoid versions < 1 week old).

This doc ties together the three per-ecosystem research files:

- [`DEP_RESEARCH_TS_ECO.md`](./DEP_RESEARCH_TS_ECO.md) — TS, ESLint, Prettier, Vite, Vitest, tsup, tsx, lint-staged, commitlint, changesets
- [`DEP_RESEARCH_FRONTEND.md`](./DEP_RESEARCH_FRONTEND.md) — Next.js, React, Radix, Tailwind, prettier-plugin-tailwindcss, shiki, marked, lucide-react, zustand, cmdk
- [`DEP_RESEARCH_DOMAIN.md`](./DEP_RESEARCH_DOMAIN.md) — discord.js, mongoose, winston, ink, commander, typedoc + plugins, kysely, pg, envapt, chalk, type-fest

Read those for per-dep migration recipes. This file is the synthesis: catalog shape, sequencing, and the cross-cutting risk picture.

---

## 1. Catalog reorg (cancrops-style)

Cancrops uses 7 buckets. Seedcord needs 3 more because it's a Discord bot framework + has docs tooling that cancrops doesn't have. Proposed 10-bucket layout (full version-pinned shape is in `TASK-02-catalog-reorg.md`):

| Bucket     | Purpose                                            | Notable contents                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deps`     | Cross-cutting runtime                              | `chalk`, `discord.js`, `envapt`, `mongoose`, `reflect-metadata`, `type-fest`, `winston`, `winston-transport`, `strip-ansi`                                                                                                                                                             |
| `cli`      | CLI / Ink runtime                                  | `@commander-js/extra-typings`, `commander`, `ink`, `ink-spinner`, `jiti`, `minimatch`, `fix-esm-import-path`                                                                                                                                                                           |
| `drivers`  | DB drivers / query builders                        | `pg`, `@types/pg`, `kysely`                                                                                                                                                                                                                                                            |
| `react`    | React-\* family + types                            | `react`, `react-dom`, `@types/react`, `@types/react-dom`                                                                                                                                                                                                                               |
| `frontend` | UI deps for apps/\*                                | Radix, `clsx`, `tailwind-merge`, `cmdk`, `lucide-react`, `marked`, `next`, `next-themes`, `postcss`, `shiki`, `tailwindcss`, `@tailwindcss/postcss`, `prettier-plugin-tailwindcss`, `zustand`, `eslint-config-next`, `eslint-plugin-jsx-a11y`                                          |
| `docs`     | Docs tooling                                       | `typedoc`, `typedoc-plugin-dt-links`, `typedoc-plugin-mdn-links`, `@leeoniya/ufuzzy`                                                                                                                                                                                                   |
| `testing`  | Vitest + helpers                                   | `vitest`, `@vitest/coverage-v8`, `chai`, `@types/chai`, `tsd`, `nodemon`                                                                                                                                                                                                               |
| `lint`     | ESLint + plugins + prettier + commit/release tools | `@typescript-eslint/*`, `typescript-eslint`, `eslint-config-prettier`, `eslint-import-resolver-typescript`, `eslint-plugin-*`, `prettier`, `@commitlint/*`, `@changesets/cli`, `husky`, `lint-staged`, `turbo`, `lodash.merge`, `@types/lodash.merge`, `@types/eslint-plugin-security` |
| `build`    | Build toolchain                                    | `@swc/core`, `vite`                                                                                                                                                                                                                                                                    |
| `peer`     | Peer-only                                          | `eslint`, `typescript`, `tsup`, `tsx`                                                                                                                                                                                                                                                  |

**Rationale for additions vs cancrops:**

- `cli` — cancrops doesn't have a TUI; seedcord does (Ink-based CLI).
- `drivers` — cancrops doesn't ship persistence drivers; seedcord's `packages/plugins` does.
- `docs` — cancrops doesn't ship a docs system; seedcord does (typedoc + plugins + ufuzzy).

**Rationale for placement decisions:**

- `prettier` under `lint` (cancrops convention).
- `prettier-plugin-tailwindcss` under `frontend` (it's a Tailwind concern, not a base lint concern).
- `@tailwindcss/postcss` (and any future `@tailwindcss/vite` for non-Next apps) under `frontend`.
- `eslint-config-next` + `eslint-plugin-jsx-a11y` under `frontend` (they're Next-specific lint plugins, but only consumed by `apps/docs` so co-locate with the rest of the frontend bucket).
- `turbo` under `lint` (it's developer tooling; lives well with husky/lint-staged).

---

## 2. Sequencing across all three ecosystems

Bumps need to land in this order to manage lockfile + peer-dep coupling:

### Order

1. **TASK-02 catalog reorg** (no version changes; just bucket structure)
2. **TASK-03 block 1**: TS 6 + typescript-eslint 9 + ESLint 10 + engines.node bump → root + tsconfig changes propagate
3. **TASK-03 block 2**: Vite 8 + Vitest 4.1.7 (Vite + Vitest peer-coupled)
4. **TASK-03 block 3**: tooling tail (tsx, lint-staged, commitlint, changesets, prettier)
5. **TASK-04 commits 1-5**: frontend patches → tailwind minor → marked major → shiki major → lucide major (in that order — patches first so failure isolates)
6. **TASK-05 commits 1-5**: domain patches/minors → typedoc lockstep → ink 7 → kysely 0.29 → stragglers
7. **TASK-06 cleanup**: drop `@eslint/eslintrc` (depends on ESLint 10 being live)

### Why this order

- **Catalog must exist before bumps** — bumps land into buckets.
- **TS major before everything** — typescript-eslint 9 needs TS 6; many other plugins' types narrow against TS 6.
- **Vite + Vitest lockstep** — vitest pins a vite peer range.
- **Frontend deps after TS major** — typescript-eslint may flag new things in apps/docs source the TS bump exposes.
- **lucide-react last** — it's a manual a11y sweep, easier to do when other deps are stable.
- **ink + kysely independently** — they don't share peer constraints; either order works after the TS major.
- **eslint-cleanup last** — depends on `@eslint/eslintrc` being unused.

---

## 3. Cross-cutting risk picture

### High-impact breakages

| Source                                        | What breaks                                                                                      | Where to look                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| TS 6 `esModuleInterop: false` removed         | Some default imports break                                                                       | `packages/tsconfig/base.json`; `pnpm tc` surfaces cascading errors        |
| TS 6 implicit `@types/*` auto-include removed | "Cannot find name 'process'" etc.                                                                | Add `"types": ["node"]` in shared base                                    |
| ESLint 10 drops eslintrc                      | `@eslint/eslintrc` dead — but we're already flat-config so no impact beyond the dead-dep removal | `packages/eslint-config/src/**`                                           |
| Vite 8 Rolldown CJS shape                     | `build.rollupOptions` → `build.rolldownOptions`                                                  | seedcord has no direct `vite.config.ts`; check vitest configs             |
| typescript-eslint 9 stricter defaults         | New lint errors on previously-ignored cases                                                      | First `pnpm lint:fix` after the bump enumerates                           |
| ink 7 input semantics                         | `key.backspace` ≠ `key.delete`, escape no longer flips `key.meta`                                | `packages/cli/src/**` interactive flows                                   |
| ink-spinner 5 peer-compat with ink 7          | May fail to resolve                                                                              | Fallback: inline a 10-line `<Spinner />`                                  |
| kysely 0.29 `withTables` removed              | API rewrite in plugins                                                                           | `packages/plugins/src/**`                                                 |
| lucide-react 1.x brand icons removed          | Github/Discord icons no longer importable                                                        | `apps/docs/src/components/ui/GithubIcon.tsx` (likely hand-rolled; verify) |
| lucide-react 1.x aria-hidden default          | Icon-only buttons lose accessible name                                                           | Manual a11y sweep                                                         |
| shiki 4 Node 18 dropped + v0.14 APIs pruned   | seedcord on Node 22+ already; just verify CSS-targeting structure                                | `apps/docs/src/lib/shiki.ts` uses only stable APIs                        |
| marked 18 trailing newline trim               | Renderer output drift                                                                            | `apps/docs/src/lib/docs/comments/**`                                      |

### Low-impact patches/minors (group into commits)

- React 19.2.3 → 19.2.6 (patch)
- `@types/react` → 19.2.15 (sibling)
- All `@radix-ui/*` to latest stable (already on latest per FE research)
- Tailwind 4.1 → 4.3 (additive)
- Next 16.1 → 16.2.6 (clean minor; async params shape already adopted)
- Mongoose 9.0.2 → 9.6.2 (additive)
- discord.js 14.25.x latest (no v15 stable yet)
- envapt 4.1.0 → 4.1.1
- typedoc 0.28.15 → 0.28.19 + plugins lockstep
- changesets, lint-staged, commitlint, prettier, husky — minor patches

### Skipped intentionally

| Package                        | Reason                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `eslint-plugin-react-compiler` | Still 19.1.0-rc.2; not stable; revisit when 1.0                 |
| `eslint-plugin-react-refresh`  | Vite-only; apps/docs is Next.js (uses its own fast-refresh)     |
| `discord.js@15`                | No stable v15; dev-tagged only; defer to its own PR when stable |
| `mongoose@10`                  | Not released                                                    |
| `winston@4`                    | Not released                                                    |
| `pg@9`                         | Not released                                                    |
| `commander@15`                 | Not released                                                    |
| `zustand@6`                    | Not released                                                    |
| `cmdk@2`                       | Not released                                                    |
| `husky@10`                     | Not released; current 9.x stable                                |

---

## 4. Security advisories

Per the per-ecosystem research, no MEDIUM+ advisories on any of the proposed target versions as of 2026-05-24. Re-run `pnpm audit` after the bumps land before merging; defer or pin around any new advisories that emerge.

---

## 5. Changeset strategy

Every bump that affects a published package's **peer ranges** or **public API typings** gets a changeset. Categories:

| Bump                                                                                     | Changeset shape                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| TS 6 (peer)                                                                              | patch on every published package; body mentions peer range bump    |
| typescript-eslint 9 (devDep on eslint-config)                                            | minor on `@seedcord/eslint-config`                                 |
| ESLint 10 (peer)                                                                         | patch on every published package + `@seedcord/eslint-config` minor |
| Vite 8 (devDep)                                                                          | no published-package change unless used in `tsup-config` peer      |
| Vitest 4.1 (devDep)                                                                      | no changeset                                                       |
| ink 7 (deps of `@seedcord/cli`)                                                          | minor on `@seedcord/cli`                                           |
| kysely 0.29 (deps of `@seedcord/plugins`)                                                | minor on `@seedcord/plugins`                                       |
| typedoc 0.28.19 + plugins (deps of `@seedcord/docs-generator` + `@seedcord/docs-engine`) | patch each                                                         |
| Frontend patches                                                                         | none (apps/docs is unpublished)                                    |
| Lucide major                                                                             | none (unpublished)                                                 |
| Marked major                                                                             | none (unpublished)                                                 |
| Mongoose minor (devDep of mock, transitive via plugins)                                  | patch on `@seedcord/plugins` if any plugin's surface narrows       |

Confirm by running `pnpm cs status` after the bumps — any divergence triggers a changeset.

---

## 6. Engines.node bump

ESLint 10 requires `node ^22.13.0`. Update `package.json` `engines.node` from `>=22.12.0` to `^22.13.0`. Document in DOCS_SYSTEM as the new floor.

This affects:
uires `node ^22.13.0`. Update `package.json` `engines.node` from `>=22.12.0` to `^22.13.0`. Document in DOCS_SYSTEM as the new floor.

This affects:

- Local dev (users on Node 22.12 break)
- CI (workflow setup-node action must request ≥22.13)
- Published packages (consumers running Node 22.12 break; document in changeset)

---

## 7. Verification protocol per bump commit

After every bump commit:

1. `pnpm install` clean — no resolution warnings
2. `pnpm tc` — 0 errors
3. `pnpm lint:fix` — 0 errors / 0 warnings
4. `pnpm test` — 100% passing
5. `pnpm build` — successful
6. `pnpm -C mock dev` smoke (30s) — bot starts cleanly
7. `pnpm docs:smoke` — samples produced
8. `pnpm cs status` — changesets reconcile

If any step fails: fix root cause in the same commit (or revert + isolate). Don't accumulate technical debt across bumps.

---

## 8. Per-bump rollback strategy

Each bump is its own commit. If a bump introduces a regression that can't be quickly fixed:

```sh
git revert <bump-commit-sha>
```

Single-commit reverts work because every bump is scoped tightly. Add a follow-up issue documenting why the bump was reverted and what would unblock retrying.

---

## 9. Open questions / follow-ups

- **Skip or include `eslint-plugin-react-compiler` when it goes stable** — currently RC; deferred. Watch for the 1.0 release; add to `lint` bucket then.
- **Discord.js 15 when stable** — major bump; own PR.
- **Husky 10 when stable** — devDep; own commit.
- **`eslint-plugin-react-refresh` if seedcord ever adopts Vite for an app** — currently N/A.

---

## 10. Reading list before starting TASK-02 / 03 / 04 / 05 / 06

1. This file (you're here)
2. `DEP_RESEARCH_TS_ECO.md` — per-dep migration recipe for the TS layer
3. `DEP_RESEARCH_FRONTEND.md` — per-dep migration recipe for frontend
4. `DEP_RESEARCH_DOMAIN.md` — per-dep migration recipe for domain
5. `TASK-02-catalog-reorg.md` — the actual catalog YAML to write
6. Then start with `TASK-01-baseline-gates.md` to confirm green state

The MASTER_PLAN.md status tracker is updated as each task completes.
