---
'seedcord': patch
---

Fixed `seedcord dev` reloading a new handler twice, because it sent an extra update after every file create or delete.
