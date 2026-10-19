---
'seedcord': patch
---

Fixed `seedcord codegen` and `commands` scanning a commands folder outside `root`. They now throw `CorePathOutsideRoot` for it, the same as the bot does at startup.
