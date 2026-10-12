---
'@seedcord/plugin-kysely-postgres': patch
---

Fixed `corrupted migrations` for two migrations that ran at the same time with names like `B` and `a`, because the plugin never passed `migrations.nameComparator` to Kysely.
