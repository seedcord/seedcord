---
'seedcord': patch
---

Fixed `seedcord build` failing at the boot step on a busy machine, with a message saying the worker closed the connection. The boot check now retries a connection that times out, for up to its full 60s.
