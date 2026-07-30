---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/logger': patch
'seedcord': patch
---

Require envapt 8.1. A bot declaring its own envapt needs `^8.1.0` there too, an older pin installs a second copy whose `Envapter` state (the bound source, the detected environment) splits from the framework's.
