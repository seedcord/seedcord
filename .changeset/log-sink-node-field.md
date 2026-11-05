---
'@seedcord/types': patch
'@seedcord/logger': patch
---

Removed the `node` field from `ILogSink` and the winston sinks, since nothing ever read it. This is deliberately a patch as the dead code was an optional field.
