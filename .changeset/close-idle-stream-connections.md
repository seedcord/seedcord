---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a node bot's shutdown waiting 5 seconds for a browser connection that had a server-sent events stream on it, like a page reading live updates.
