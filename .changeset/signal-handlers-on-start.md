---
'@seedcord/core': patch
---

A bot now installs its SIGINT and SIGTERM handlers in `start()`, and `new Seedcord()` alone leaves them off. Adding or removing a startup or shutdown task no longer writes a debug log line.
