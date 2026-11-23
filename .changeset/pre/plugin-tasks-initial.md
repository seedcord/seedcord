---
'@seedcord/plugin-tasks': minor
'@seedcord/errors': minor
---

Added `@seedcord/plugin-tasks`, which runs the `Task` classes in a folder on a cron pattern, or once later through `tasks.schedule()`. Scheduled tasks are stored in `config.kv`, so they're still there after a restart if your driver keeps its records. Cron jobs and scheduled jobs don't run on their own under `seedcord dev` unless you pass `runInDev: true` to the plugin.
