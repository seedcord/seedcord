---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/types': minor
'@seedcord/logger': minor
'@seedcord/plugin-kysely-postgres': minor
'@seedcord/plugin-mongoose': minor
---

**BREAKING:** Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together!!
