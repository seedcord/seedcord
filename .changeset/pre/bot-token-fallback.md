---
'@seedcord/core': patch
'@seedcord/errors': patch
'@seedcord/http': patch
---

The bot now reads its token from `BOT_TOKEN` when `DISCORD_BOT_TOKEN` is unset, so a bot moving to seedcord can keep its old variable name.
