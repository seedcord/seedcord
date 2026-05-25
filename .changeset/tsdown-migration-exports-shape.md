---
'@seedcord/cli': patch
'@seedcord/plugins': patch
'@seedcord/services': patch
'@seedcord/types': patch
'@seedcord/utils': patch
'@seedcord/docs-engine': patch
'@seedcord/docs-generator': patch
'@seedcord/eslint-config': patch
'seedcord': patch
---

Build pipeline migrated from `tsup` to `tsdown` (Rolldown + oxc). Distributed output shape changed accordingly: instead of a single `dist/index.d.ts` plus `.mjs` / `.cjs`, each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (the `.d.cts` is a one-line `export type * from './index.d.mts'` stub via `dts.cjsReexport: true`, avoiding the dual-module hazard). The `exports` map in each package.json was updated from a single `types` entry to per-condition (`import.types` → `.d.mts`, `require.types` → `.d.cts`); modern bundlers and TypeScript resolve both paths transparently. Source-level public API is unchanged. Internal `@seedcord/tsup-config` was renamed to `@seedcord/tsdown-config` and marked private — the previously-published `@seedcord/tsup-config@1.1.2` will be `npm deprecate`d post-release.
