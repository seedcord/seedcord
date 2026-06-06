# @seedcord/tsconfig

## 2.0.0-next.0

### Major Changes

- a34366b: **BREAKING**: strip compiler options that became defaults or no-ops in ts 6.0. `esModuleInterop` is no longer set (was explicit `false` in `1.1.2`); consumers on ts 6.0+ now inherit the default of `true`. set `"esModuleInterop": false` in your own tsconfig if you depend on the older import semantics. also drops `allowSyntheticDefaultImports`, all 8 emit-related flags (no-op under `noEmit: true`), 3 redundant-default flags (`noPropertyAccessFromIndexSignature`, `allowArbitraryExtensions`, `allowImportingTsExtensions`), and the redundant `Decorators` + `Decorators.Legacy` lib entries (transitively included via `ESNext` per ts pr #63408). framework decorator code (`@Command`, `@RegisterEffect`, `@Envapt`) verified clean.

## 1.1.2

### Patch Changes

- f8fbe70: bump general dependencies

## 1.1.1

### Patch Changes

- 1d8986b: bump deps

## 1.1.0

### Minor Changes

- ec50439: make package public

## 1.0.6

### Patch Changes

- a1a90e6: custom seedcord errors and error codes

## 1.0.5

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps

## 1.0.4

### Patch Changes

- bump deps

## 1.0.3

### Patch Changes

- 8a7591a: bump deps

## 1.0.2

### Patch Changes

- 5ac7d83: cleanup package files and bump deps

## 1.0.1

### Patch Changes

- 48a8c9b: fix repository url in package.json
- 48a8c9b: add LICENSE to all package roots

## 1.0.1-alpha.0

### Patch Changes

- 73a33a5: fix repository url in package.json
- dad89c6: add LICENSE to all package roots
