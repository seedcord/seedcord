---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

Handler, middleware, command, subscriber, and service folders now load their files sorted by path.
