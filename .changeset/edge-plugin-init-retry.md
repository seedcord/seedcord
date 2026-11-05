---
'@seedcord/http': patch
'@seedcord/core': patch
---

Fixed an edge bot failing every request after a plugin's `init()` timed out. The next request now starts the bot again.
