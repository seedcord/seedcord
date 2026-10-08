---
'@seedcord/types': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Removed the `runtime` field from the bot config, since nothing read it. If your config sets `runtime: 'server'`, delete that line.
