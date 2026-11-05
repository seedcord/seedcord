---
'@seedcord/http': patch
'@seedcord/logger': patch
---

Fixed an async log sink on an edge bot getting cut off when the request ended, which lost the lines that it was sending to a log service.
