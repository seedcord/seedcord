---
'@seedcord/plugins': patch
---

Fix the Mongo plugin crashing during shutdown when the initial connection never succeeded (e.g. a connect timeout). `disconnect()` now no-ops when no connection was established.
