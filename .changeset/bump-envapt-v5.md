---
"seedcord": patch
"@seedcord/services": patch
"@seedcord/plugins": patch
---

Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
