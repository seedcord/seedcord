---
'seedcord': patch
---

Fixed `seedcord dev` in JSON mode refreshing commands once per saved file, which could deploy a command halfway through an edit across files. It now refreshes once, 2 seconds after your last save.
