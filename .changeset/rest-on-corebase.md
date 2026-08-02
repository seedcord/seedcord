---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

`core.rest` is on `CoreBase`, so both transports expose the Discord REST client. Gateway returns the discord.js client's own, which carries no token until the Login phase.
