---
'@seedcord/gateway': patch
---

Fixed a `guildMemberUpdate` event gate reading the old roles and permissions, so a role check saw the member as they were before the update.
