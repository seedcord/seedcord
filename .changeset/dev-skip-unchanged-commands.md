---
'seedcord': minor
'@seedcord/core': minor
---

`seedcord dev` now skips deploying the global commands, or one guild's commands, when they haven't changed since the last deploy and Discord has commands with the same names. It reads their ids from Discord, and keeps the last deploy in `.seedcord/deployed-commands.json`.
