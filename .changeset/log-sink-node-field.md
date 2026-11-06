---
'@seedcord/types': patch
'@seedcord/logger': patch
---

Removed the `node` field from `ILogSink` and the winston sinks, since nothing ever read it.
