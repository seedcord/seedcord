---
'@seedcord/gateway': minor
---

**BREAKING:** the `unknownException` payload carries plain `guild` and `user` objects (`{ id, name }` and `{ id, username }`), each key omitted when absent. A subscriber that read other discord.js fields off the payload now fetches them through the client.
