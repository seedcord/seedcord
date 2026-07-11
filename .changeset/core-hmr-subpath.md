---
'@seedcord/core': minor
---

Add the `./hmr` subpath with `HmrModuleHandler` and `HmrManager`, moved from `@seedcord/gateway`. `./internal` exports `wrapHot` (from `@seedcord/types/internal`) and the dev-channel accessors. The `.` and `./internal` entries stay free of `node:*` imports, hmr's `node:fs` reads are only the `./hmr` entry.
