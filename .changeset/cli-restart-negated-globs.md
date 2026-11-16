---
'seedcord': patch
---

Fixed `seedcord dev` restarting on almost every save when `hmr.restart` or a plugin's `registerCriticalFiles` had a `!` pattern. Now a file that a `!` pattern matches doesn't need a restart.
