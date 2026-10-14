---
'@seedcord/http': patch
---

An edge bot now applies `config.logger` when it handles its first request. Anything logged before that, like a plugin logging from its constructor, goes to the console at the default level.
