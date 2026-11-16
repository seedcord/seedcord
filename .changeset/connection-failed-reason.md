---
'@seedcord/errors': patch
'@seedcord/plugin-kysely': patch
'@seedcord/plugin-mongoose': patch
---

`PluginConnectionFailed` now includes the driver's own message, like `ECONNREFUSED`, so you don't have to dig it out of `cause`.
