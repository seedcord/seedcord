---
'@seedcord/core': minor
'seedcord': patch
---

Dissolve `@seedcord/kit` into `@seedcord/core`. The Notice stop tree, the customId codec, and pagination move into `@seedcord/core`, joining the component builders already there, and `@seedcord/kit` is removed.

**BREAKING:** `@seedcord/kit` is removed. Import its former exports (`Notice`, `Fault`, `Silence`, `CustomId`, `paginate`, `PageView`, `BuilderComponent`, `RowComponent`) from `seedcord` or `@seedcord/core`.
