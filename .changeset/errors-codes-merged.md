---
'@seedcord/errors': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/utils': minor
'@seedcord/plugin-mongoose': minor
'@seedcord/plugin-kysely-postgres': minor
'seedcord': minor
'create-seedcord': minor
---

**BREAKING:** Error codes that cover the same failure are now merged into one. The five match-arm codes are now `MatchArmMissing`, for example. Every code also has a new number, so branch on the `SeedcordErrorCode` member.
