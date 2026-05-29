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

build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
