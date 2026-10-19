---
'@seedcord/errors': minor
---

Added `CoreDirectorySkipped` for a folder that `seedcord build` leaves out of the bot, like a dot-folder or `outDir`, when `readFiles`, `importFiles` or `files` in `seedcord.config.ts` points at it.
