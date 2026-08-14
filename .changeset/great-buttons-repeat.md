---
'seedcord': patch
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/logger': patch
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
---

_Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
