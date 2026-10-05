---
'@seedcord/http': patch
---

Added `bot.restOptions` to the http config to configure the Discord REST client. An edge config can't set `hashSweepInterval` or `handlerSweepInterval`, because workerd throws when their timers start at a worker's global scope.
