---
'@seedcord/gateway': patch
---

Fixed the handlers registered on one event running one after another. They now run at the same time.
