---
'seedcord': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

A built bot now reads its `.env` files from the folder that holds `seedcord.config.ts`, from whichever folder you start it. `bot.ts` no longer needs `Envapter.baseDir = resolve(import.meta.dirname, '..')`, and a bot that sets `baseDir` itself keeps its own folder.
