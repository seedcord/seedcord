---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

`seedcord dev` now _hot_ reloads a plugin that your bot file attaches when you save the plugin's file or one of its imports. It disposes the running plugin and starts the saved class with the arguments you passed to `attach()`.
