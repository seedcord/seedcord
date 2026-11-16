---
'@seedcord/errors': patch
'@seedcord/plugin-kysely': patch
'@seedcord/plugin-mongoose': patch
---

`PluginConnectionFailed` now includes the driver's error, like `connect ECONNREFUSED 127.0.0.1:5432`, and the option to check.
