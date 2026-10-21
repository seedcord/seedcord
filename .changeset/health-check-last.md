---
'@seedcord/core': patch
'@seedcord/gateway': patch
---

Fixed a gateway bot answering its health path before every plugin's `ready()` finished. The health server now opens once startup is done.
