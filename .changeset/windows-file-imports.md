---
'@seedcord/utils': patch
---

Bots now start on Windows. seedcord imported handler, command, and subscriber files by raw filesystem path, and Node read the `D:` drive letter as a URL protocol.
