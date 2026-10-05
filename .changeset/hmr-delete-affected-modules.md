---
'seedcord': patch
'@seedcord/types': patch
---

Fixed the delete event in `seedcord dev` leaving out `affectedModules`. It now lists the deleted file and every file that imported it.
