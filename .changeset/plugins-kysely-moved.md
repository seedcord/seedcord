---
'@seedcord/plugins': minor
---

**BREAKING:** the kysely Postgres surface moves to `@seedcord/plugin-kysely-postgres`. Install that package and update the import path, including any `declare module` block that augments `KyselyServices`.
