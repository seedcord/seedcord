---
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Interaction handlers and middleware now have `this.user`, the user who sent the interaction. On http it reads `member.user` in a guild, where `this.event.user` is undefined.
