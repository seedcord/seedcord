---
'@seedcord/gateway': patch
---

Fixed a class with two `once` events running only one of them. Because seedcord marked the whole class as run, `guildMemberAdd` and `guildMemberUpdate` registered with `{ frequency: 'once' }` ran whichever fired first and never the other.
