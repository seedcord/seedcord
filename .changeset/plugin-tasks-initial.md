---
'@seedcord/plugin-tasks': minor
---

Added `@seedcord/plugin-tasks`, which runs the `Task` classes in a folder on a cron pattern, or once later through `tasks.schedule()`. A scheduled job is stored in `config.kv`, so it survives a restart if your driver keeps its records.
