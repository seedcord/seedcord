---
'seedcord': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/logger': minor
---

A built bot now reads its `.env` files and resolves a relative log file name in the project folder that holds `seedcord.config.ts`, from whichever folder you start it. A bun binary, or a build copied away from its `package.json`, uses the folder you start it from. `bot.ts` no longer needs `Envapter.baseDir = resolve(import.meta.dirname, '..')`, though a `baseDir` you set there still wins.
