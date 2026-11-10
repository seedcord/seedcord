---
'@seedcord/types': minor
---

**BREAKING:** Removed `TypedOmit`, `TypedExclude`, and `TypedExtract`, so use `Except`, `ExcludeStrict`, and `ExtractStrict` from `type-fest`. Removed `Tail`, so use `ArrayTail` from `type-fest`. Removed `FilterUnionByProperty`, `StringStartsWith`, `StringEndsWith`, and `StringContains`, so use TypeScript's `Extract`.
