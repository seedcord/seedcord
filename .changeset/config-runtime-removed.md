---
'@seedcord/types': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Removed the `runtime` field from the bot config, since nothing read it. Delete it from your config, and write `Seedcord` where you wrote `Seedcord<HttpServerConfig>`.
