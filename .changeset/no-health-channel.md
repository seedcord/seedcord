---
'@seedcord/logger': minor
'@seedcord/types': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** seedcord doesn't log on a `health` channel anymore. The bot's web server logs on a new `server` channel, so rename any plugin attached under the key `server`.
