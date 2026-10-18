---
'seedcord': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/logger': minor
---

A built bot now reads its `.env` files and writes its `logs/` folder in the folder that holds `seedcord.config.ts`, from whichever folder you start it. `bot.ts` no longer needs `Envapter.baseDir = resolve(import.meta.dirname, '..')`, and a bot that sets `baseDir` itself keeps its own folder.
