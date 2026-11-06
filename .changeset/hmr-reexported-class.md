---
'@seedcord/core': patch
---

Fixed a subscriber, handler, or command that a barrel file re-exports registering once per file. A subscriber ran twice per event, and deleting the barrel under `seedcord dev` unregistered it while its own file still exported it.
