---
'seedcord': patch
---

Fixed `seedcord dev` restarting on almost every save when `hmr.restart` or a plugin's `registerCriticalFiles` had a `!` pattern. Now a `!` pattern excludes the files it matches from the other patterns that came with it.
