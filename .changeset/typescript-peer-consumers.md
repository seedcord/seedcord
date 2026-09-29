---
'seedcord': patch
'@seedcord/core': patch
'@seedcord/custom-id': patch
'@seedcord/errors': patch
'@seedcord/event-emitter': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/logger': patch
'@seedcord/rate-limiter': patch
'@seedcord/types': patch
'@seedcord/utils': patch
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
---

Fixed the peer conflict a bot on TypeScript 5 hit at install. The `typescript` peer now accepts 5, 6, and 7.
