---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a node bot's shutdown waiting 5 seconds on a browser connection after its server-sent events stream closed.
