---
'@seedcord/plugin-kysely-postgres': minor
---

**BREAKING:** `migrations.path` is now `migrations.dir`, and it takes one folder with its subfolders. Every file in it now has to export `up` by name or on a default export object, or the plugin throws `PluginKyselyInvalidMigrationModule`.
