---
'@seedcord/types': minor
'@seedcord/logger': minor
---

A log sink's `dispose()` can now return a promise, and a node bot waits for it before it exits. `WinstonFileSink` uses this to finish writing its file.
