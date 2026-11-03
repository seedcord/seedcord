---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Fixed `Cannot properly serialize component type: undefined` when your bot and seedcord resolved different versions of `@discordjs/builders`. It's now a peer dependency, so seedcord uses your bot's copy. On Yarn, add it to your bot's dependencies.
