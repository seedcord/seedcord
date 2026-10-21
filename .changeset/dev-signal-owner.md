---
'@seedcord/core': patch
---

Fixed a bot under `seedcord dev` exiting on its own at `SIGTERM` before the CLI cleared its interactions endpoint.
