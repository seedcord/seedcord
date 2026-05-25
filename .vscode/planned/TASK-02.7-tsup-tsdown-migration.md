# TODO 02.7: tsup → tsdown migration

## Overview

Inserted into the `chore/dep-bump-batch-01-05` batch mid-flight to unblock TypeScript 6. `tsup@8.5.1` injects `baseUrl: "."` into its DTS build's compilerOptions; TS 6 emits `TS5101` (deprecation as error) and refuses to build. Upstream PR `#1390` open at the time. Migrated build pipeline to `tsdown` (built on Rolldown + oxc by VoidZero, same group as Vite / Rolldown / oxc) which has no such injection bug.

## Why

- TS 6 + tsup = blocked.
- We can't `ignoreDeprecations: "6.0"` per policy (no silencing deprecations).
- tsdown is the spiritual successor maintained by sxzz (Kevin Deng) and explicitly designed as a tsup migration path. Comparable feature set; usually faster; native TS 6 support.

## What changed (commit `0fd0585b`)

- Renamed `packages/tsup-config/` → `packages/tsdown-config/` via `git mv` to preserve history.
- Marked the package `"private": true` and removed `publishConfig` — only consumed internally (44 monthly npm downloads on the old name; user accepted leaving `@seedcord/tsup-config` on npm as orphaned, will deprecate manually).
- Renamed `createTsupConfig` → `createTsdownConfig`; switched imports from `tsup` to `tsdown`.
- Mapped tsup options → tsdown equivalents (see commit body for the table).
- Catalog: `peer.tsup: 8.5.1` → `peer.tsdown: 0.22.0`.
- Updated all 10 `tsup.config.ts` → `tsdown.config.ts` (git mv + minor content rewrite).
- Updated 8 consumer package.json refs and build scripts.
- Switched every published package's `exports` map from the single `index.d.ts` shape to dual conditional types (`{import: {types: index.d.mts, default: index.mjs}, require: {types: index.d.cts, default: index.cjs}}`). The `.d.cts` is a 1-line `export type * from './index.d.mts'` stub via `dts.cjsReexport: true` — avoids the dual-module hazard.

## Handoff

- 2026-05-25 — completed by Claude Opus on sub-branch `chore/dep-bump-batch-01-05`. Commit `0fd0585b`. Verified: `pnpm install --frozen-lockfile` clean; `pnpm prePush` exit 0 across all 23 turbo tasks; `pnpm docs:smoke` produces the same 41/53 samples as TASK-01 baseline; mock bot builds cleanly. The `@seedcord/tsup-config@1.1.2` package on npm becomes orphaned (44 monthly downloads, no real external consumers); user to manually `npm deprecate` it post-merge if desired.
