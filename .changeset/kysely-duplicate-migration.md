---
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/errors': patch
---

Fixed a listed migration going missing when another listed file has the same name, like `users/001-init.ts` and `guilds/001-init.ts`. Startup now throws `PluginKyselyDuplicateMigrationName` with both file paths.
