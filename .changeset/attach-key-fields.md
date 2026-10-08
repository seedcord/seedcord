---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed `attach` rejecting a few unused keys as already taken, like `seedcord.attach('token', MyPlugin)` on an http bot.
