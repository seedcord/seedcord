---
'@seedcord/plugin-kysely': patch
'@seedcord/plugin-mongoose': patch
---

Fixed `connection` reading `undefined` before `init()`, and on Mongoose the closed connection after `dispose()`. Both now throw `PluginNotReady`, the same as `services`.
