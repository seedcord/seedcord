---
'@seedcord/http': patch
---

A node http bot now fails to start with `PortInUse` when another process already listens on its `port`. On macOS, outside a `seedcord dev` quick tunnel, the bot starts anyway if that process listens on `127.0.0.1` only.
