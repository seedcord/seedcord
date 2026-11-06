---
'@seedcord/core': patch
---

Fixed two quick saves under `seedcord dev` leaving an old copy of a handler or middleware registered next to the new one, so both ran.
