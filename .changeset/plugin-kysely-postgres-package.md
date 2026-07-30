---
'@seedcord/plugin-kysely-postgres': minor
---

The kysely Postgres plugin ships as its own package, and it attaches to a gateway bot and to an http server bot. It replaces the kysely surface from `@seedcord/plugins`, where the class was `KyselyPg` and every export carried a `Kpg` prefix.

**BREAKING:** augment `KyselyDatabase` with your schema once. `KyselyPostgres` takes no type argument, `KyselyService<MyDatabase, 'users'>` becomes `KyselyService<'users'>`, and a table disagreeing with the one `@RegisterKyselyService` resolves to is a compile error.

**BREAKING:** `stop()` is now `dispose()`. The plugin declares its shutdown step, so the host runs it only when `init()` resolved.

**BREAKING:** `KyselyService` takes `CoreBase` as its second constructor parameter.

A failure after the pool opens closes it before `init()` rejects.
