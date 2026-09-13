# @seedcord/docs-generator

## 0.2.4

### 🩹 Patch

- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

## 0.2.3

### 🩹 Patch

- export "version" variable with the actual semantic version of each package ([`225977a`](https://github.com/seedcord/seedcord/commit/225977a))
- bump deps ([`d938005`](https://github.com/seedcord/seedcord/commit/d938005))
- build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- Bump `typedoc` 0.28.15 → 0.28.19 and its plugins `typedoc-plugin-dt-links` ^2.0.34 → ^2.0.56 and `typedoc-plugin-mdn-links` ^5.0.10 → ^5.1.1 in lockstep. 0.28.18 adds TypeScript 6 support (clears the prior peer warning); 0.28.19 ships translations + comment-slash normalization. `pnpm docs:smoke` output is bit-identical to baseline. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))

## 0.2.2

### 🩹 Patch

- bump general dependencies ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))

## 0.2.1

### 🩹 Patch

- bump deps ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))

## 0.2.0

### ✨ Minor

- api json generator using typedoc ([#50](https://github.com/seedcord/seedcord/pull/50))

### 🩹 Patch

- improve type exports and tsdoc ([#56](https://github.com/seedcord/seedcord/pull/56))
