---
'@seedcord/core': patch
---

A bot now installs its SIGINT and SIGTERM handlers in `start()`. Calling `new Seedcord()` without `start()`, like `seedcord codegen` does, no longer installs them or logs the startup tasks.
