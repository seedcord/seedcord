---
'@seedcord/plugins': minor
---

Bump `kysely` `^0.28.9` → `^0.29.2` (pre-1.0 minor = de-facto major). Migration helpers (`FileMigrationProvider`, `Migrator`, `NO_MIGRATIONS`, `MigrationInfo`, `MigrationProvider`, `MigrationResult`, `MigrationResultSet`, `Migration`) are now imported from `'kysely/migration'`; the root-package re-exports were deprecated in 0.29 and emit `KyselyTypeError` if used. `NO_MIGRATIONS` (value) is no longer re-exported as a type marker — switched `MigrationTarget` typedef from `typeof NO_MIGRATIONS` to the `NoMigrations` interface directly. No `withTables` call sites in our source, so the API removal is not load-bearing.
