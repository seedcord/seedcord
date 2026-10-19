---
'seedcord': patch
---

Fixed `seedcord build` passing a handlers, commands or subscribers folder inside a dot-folder or `outDir`. It now throws `CoreDirectorySkipped` for it, the same as the bot does at startup.
