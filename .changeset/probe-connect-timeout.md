---
'seedcord': patch
---

Fixed `seedcord build` failing at the boot step on a busy machine, with a message saying the worker closed the connection. The boot check now keeps trying for its full 60s when it can't connect.
