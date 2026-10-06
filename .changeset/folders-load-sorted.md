---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

Handler, command, subscriber, and service folders now load their files sorted by path, the same order on every machine.
