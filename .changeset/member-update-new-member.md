---
'@seedcord/gateway': minor
---

**BREAKING:** Fixed a `guildMemberUpdate` event gate reading the old roles and permissions. Role and permission gates now check the member after the update, so a role change can start or stop a handler that ran before.
