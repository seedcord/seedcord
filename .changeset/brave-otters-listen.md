---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/logger': minor
'@seedcord/plugin-kysely-postgres': minor
'@seedcord/plugin-mongoose': minor
---

**BREAKING:** seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property.
