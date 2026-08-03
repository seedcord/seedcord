---
'@seedcord/plugin-kysely-postgres': minor
---

New `@seedcord/plugin-kysely-postgres`, replacing the kysely surface from `@seedcord/plugins`. It attaches to a gateway bot and to an http server bot.

Augment `KyselyDatabase` with your schema once, then `KyselyService<'users'>` resolves against it. A failure after the pool opens closes it before `init()` rejects.
