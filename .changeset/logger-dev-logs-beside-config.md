---
'@seedcord/logger': patch
'seedcord': patch
---

Fixed `seedcord dev` writing its `logs` folder into whichever folder you ran it from. It now writes beside `seedcord.config.ts` like a built bot does, and the dev watcher ignores that folder.
