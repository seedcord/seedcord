# @seedcord/tsconfig

## 2.0.3

### 🩹 Patch

- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

## 2.0.2

### 🩹 Patch

- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

## 2.0.1

### 🩹 Patch

- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

## 2.0.0

### 💥 Breaking

- strip compiler options that became defaults or no-ops in ts 6.0. `esModuleInterop` is no longer set (was explicit `false` in `1.1.2`); consumers on ts 6.0+ now inherit the default of `true`. set `"esModuleInterop": false` in your own tsconfig if you depend on the older import semantics. also drops `allowSyntheticDefaultImports`, all 8 emit-related flags (no-op under `noEmit: true`), 3 redundant-default flags (`noPropertyAccessFromIndexSignature`, `allowArbitraryExtensions`, `allowImportingTsExtensions`), and the redundant `Decorators` + `Decorators.Legacy` lib entries (transitively included via `ESNext` per ts pr #63408). framework decorator code (`@Command`, `@RegisterEffect`, `@Envapt`) verified clean. ([`a34366b`](https://github.com/seedcord/seedcord/commit/a34366b))

## 1.1.2

### 🩹 Patch

- bump general dependencies ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))

## 1.1.1

### 🩹 Patch

- bump deps ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))

## 1.1.0

### ✨ Minor

- make package public ([#78](https://github.com/seedcord/seedcord/pull/78))

## 1.0.6

### 🩹 Patch

- custom seedcord errors and error codes ([#62](https://github.com/seedcord/seedcord/pull/62))

## 1.0.5

### 🩹 Patch

- set up project-wide ci/cd ([#47](https://github.com/seedcord/seedcord/pull/47))
- bump deps ([`31d1a56`](https://github.com/seedcord/seedcord/commit/31d1a56))

## 1.0.4

### 🩹 Patch

- bump deps

## 1.0.3

### 🩹 Patch

- bump deps ([`8a7591a`](https://github.com/seedcord/seedcord/commit/8a7591a))

## 1.0.2

### 🩹 Patch

- cleanup package files and bump deps ([`5ac7d83`](https://github.com/seedcord/seedcord/commit/5ac7d83))

## 1.0.1

### 🩹 Patch

- fix repository url in package.json ([#19](https://github.com/seedcord/seedcord/pull/19))
- add LICENSE to all package roots ([#19](https://github.com/seedcord/seedcord/pull/19))
