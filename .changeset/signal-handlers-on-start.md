---
'@seedcord/core': patch
---

`Seedcord` now listens for SIGINT and SIGTERM once `start()` runs. Building a bot without starting it, like a test or `seedcord codegen` does, leaves the process's Ctrl+C handling unchanged.
