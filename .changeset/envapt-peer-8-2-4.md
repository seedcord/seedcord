---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/logger': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
'seedcord': patch
---

The `envapt` peer now starts at 8.2.4, which reloads the `.env` files when the CLI sets the mode.
