---
'@seedcord/gateway': patch
'@seedcord/types': patch
'@seedcord/core': patch
'@seedcord/http': patch
'seedcord': patch
---

Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one.
