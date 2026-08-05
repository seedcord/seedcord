---
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/gateway': patch
'@seedcord/core': patch
'@seedcord/http': patch
'seedcord': patch
---

A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
