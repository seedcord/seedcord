---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
---

'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing.
