---
'@seedcord/utils': patch
---

Fixed `importFiles` and `readFiles` showing a file outside the working directory as a long relative path, like `../../../../bot/handlers/Roll.js`. They now show its full path, `/bot/handlers/Roll.js` for example.
