---
'@seedcord/plugin-tasks': minor
---

Added `@seedcord/plugin-tasks`, which runs the `Task` classes in a folder on a cron pattern, or once later through `tasks.schedule()`. The plugin stores a scheduled job in `config.kv`, so a driver that keeps its records still holds the job after a restart.
