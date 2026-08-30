---
'@seedcord/gateway': minor
'@seedcord/errors': minor
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/http': minor
'seedcord': minor
---

_Kinda BREAKING:_ `core.shutdown` and `core.startup` now carry `addTask` alone, and `core.version`, `core.augmentTarget`, and `core.pluginKeys` are gone from the host. `core.bus` carries `publish` alone, and `core.bot` drops `init`. (These were already marked internal. If you were using them, you shouldn't have.) The http transport's `Core` declares the same two lifecycle members, and a core built by `createSeedcord` throws `CoreLifecycleUnavailable` from either one.
