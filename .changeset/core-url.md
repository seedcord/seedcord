---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Added `core.url`, which gives a plugin the address people reach the bot at, from the new `server.url` config key. Under `seedcord dev`, a bot without `server.url` gets its `dev.tunnel` URL, or its localhost address.
