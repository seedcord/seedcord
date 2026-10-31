---
'@seedcord/plugin-mongoose': minor
'@seedcord/plugin-kysely-postgres': minor
---

`seedcord codegen` now fills in `MongooseServices` and `KyselyServices` from your decorated service classes. You can delete the `declare module` blocks that list your services.
