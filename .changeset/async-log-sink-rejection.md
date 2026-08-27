---
'@seedcord/logger': patch
---

A log sink whose `onLog` returns a rejected promise used to crash the process. It now prints the same one-time console warning a synchronous throw does.
