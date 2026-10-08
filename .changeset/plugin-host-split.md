---
'@seedcord/core': minor
---

`Pluggable` in `@seedcord/core/node` is now `ServerHost`. `@seedcord/core/plugin` now exports `PluginHost`, the base class that defines `attach`. This is intentionally not marked as breaking, as users were not supposed to import `Pluggable` directly.
