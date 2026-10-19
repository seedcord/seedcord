---
'@seedcord/utils': patch
---

Under `seedcord dev`, `readFiles` and `traverseDirectory` now throw `CoreDirectorySkipped` for a folder like `./locales/.cache`, because `seedcord build` leaves it out of the bot. `readFiles('./locales')` also skips a `node_modules` inside it now, the same as the build.
