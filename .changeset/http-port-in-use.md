---
'@seedcord/http': patch
---

A node http bot now fails to start with `PortInUse` when another process already listens on its `port`.
