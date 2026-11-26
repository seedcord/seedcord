---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

`seedcord dev` now _hot_ reloads a plugin when you save its file or a file that file imports as long as your bot file attaches it. It disposes the running plugin and starts the saved class with the arguments you passed to `attach()`.
