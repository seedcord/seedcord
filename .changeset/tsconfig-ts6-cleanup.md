---
'@seedcord/tsconfig': major
---

**BREAKING**: strip compiler options that became defaults or no-ops in ts 6.0. `esModuleInterop` is no longer set (was explicit `false` in `1.1.2`); consumers on ts 6.0+ now inherit the default of `true`. set `"esModuleInterop": false` in your own tsconfig if you depend on the older import semantics. also drops `allowSyntheticDefaultImports`, all 8 emit-related flags (no-op under `noEmit: true`), 3 redundant-default flags (`noPropertyAccessFromIndexSignature`, `allowArbitraryExtensions`, `allowImportingTsExtensions`), and the redundant `Decorators` + `Decorators.Legacy` lib entries (transitively included via `ESNext` per ts pr #63408). framework decorator code (`@Command`, `@RegisterEffect`, `@Envapt`) verified clean.
