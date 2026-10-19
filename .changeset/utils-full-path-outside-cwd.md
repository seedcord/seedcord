---
'@seedcord/utils': patch
---

`traverseDirectory` and `readTextFiles` now show a file outside the working directory by its full path, like `/bot/handlers/Roll.js` where they showed `../../../../bot/handlers/Roll.js`.
