---
'@seedcord/http': patch
---

Added `bot.restOptions` to the http config, passed to the Discord REST client on node and edge. An edge bot can now start at a worker's global scope, because the REST client starts with both sweepers off.
