---
'@seedcord/logger': patch
---

A node bot now keeps running after its stdout closes, for example when you pipe its output into `head`, and its console logs stop. Before, it crashed on the failed write, or spun a CPU core if it had an `uncaughtException` handler.
