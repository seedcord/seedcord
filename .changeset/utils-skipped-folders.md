---
'@seedcord/utils': patch
---

Fixed `seedcord dev` reading folders that `seedcord build` leaves out of the bot. `readFiles` and `importFiles` now throw `CoreDirectorySkipped` for a folder like `./locales/.cache`, and both skip a `node_modules` inside the folder they read.
