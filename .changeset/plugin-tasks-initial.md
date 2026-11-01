---
'@seedcord/plugin-tasks': minor
---

Added `@seedcord/plugin-tasks`, which runs a folder of `Task` classes on cron patterns or once at a later time through `tasks.schedule()`. Scheduled jobs live in `config.kv`, so with a driver that keeps its records a pending job survives a restart.
