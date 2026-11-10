---
'@seedcord/plugin-tasks': minor
---

Added `@seedcord/plugin-tasks`, which runs the `Task` classes in a folder on a cron pattern, or once later through `tasks.schedule()`. Scheduled jobs are stored in `config.kv`, so they're still there after a restart if your driver keeps its records.
