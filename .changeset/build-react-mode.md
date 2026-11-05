---
'seedcord': patch
---

Fixed `seedcord build` throwing `dispatcher.getOwner is not a function` when a file that `bot.ts` imports renders React while it loads.
