---
'@seedcord/core': minor
---

`@RegisterCommand()` with no arguments deploys a command to the guilds in `commands.guilds`. With no ids there, it deploys globally. `@RegisterCommand('guild', ['config', '123'])` deploys to those same guilds plus `123`.
