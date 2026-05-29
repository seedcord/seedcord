---
'@seedcord/types': minor
'seedcord': minor
'@seedcord/plugins': patch
---

**BREAKING**: drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`.
