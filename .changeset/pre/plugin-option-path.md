---
'@seedcord/plugin-kysely': minor
'@seedcord/plugin-mongoose': minor
---

**BREAKING:** The services folder option is now `path`, matching `interactions: { path }` in the bot config, and Kysely's `migrations.dir` is now `migrations.path`. Rename `dir` to `path` in your `attach` options.
