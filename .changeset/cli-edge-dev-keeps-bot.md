---
'seedcord': patch
---

Fixed `seedcord dev` on an edge bot answering every request with a 404 after you saved `bot.ts` or a file it imports. The bot now keeps answering with the code it started with until you restart.
