---
'@seedcord/logger': minor
'@seedcord/types': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** The bot's web server now logs on a new `server` channel on both transports. That makes `server` a reserved name, so rename any plugin you attach under the key `server`.
