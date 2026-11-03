---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed `Cannot properly serialize component type: undefined` when your bot and seedcord resolved different versions of `@discordjs/builders`. It's now a peer dependency, so seedcord uses your bot's copy.
