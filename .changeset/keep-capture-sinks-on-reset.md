---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one.
