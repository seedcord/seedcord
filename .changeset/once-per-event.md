---
'@seedcord/gateway': patch
---

Fixed a class registered with two `once` events, like `guildMemberAdd` and `guildMemberUpdate`, running only whichever fired first.
