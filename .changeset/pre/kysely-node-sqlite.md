---
'@seedcord/plugin-kysely': minor
---

Added `nodeSqlite()`, which wraps a `node:sqlite` database for Kysely's `SqliteDialect`, like `new SqliteDialect({ database: nodeSqlite(new DatabaseSync('bot.db')) })`.
