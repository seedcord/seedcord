---
'@seedcord/errors': minor
---

Added `CoreCommandGuildsEmpty` (1213), thrown at startup when `@RegisterCommand('guild', [...])` passes `'config'` while `commands.guilds` is empty.
