---
'@seedcord/logger': minor
---

**BREAKING:** `Logger.inChannel()` is now `withChannel()`. The new `withLabel()` returns a logger on the same channel with a different label, like one per job a plugin runs.
