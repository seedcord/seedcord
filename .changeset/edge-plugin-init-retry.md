---
'@seedcord/http': patch
'@seedcord/core': patch
---

Fixed an edge bot failing every request after a plugin's `init()` timed out. The bot now starts again on the first request after that init finishes, or after 25 seconds if it never does.
