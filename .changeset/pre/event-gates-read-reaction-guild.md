---
'@seedcord/gateway': patch
---

Fixed `ctx.guild` and `ctx.channelId` being null in an event gate when someone reacts to a message or joins a voice channel in a guild.
