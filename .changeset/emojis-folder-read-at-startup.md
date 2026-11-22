---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Your bot now reads the `emojis` folder beside `seedcord.config.ts` when it starts, and stops if a file in it isn't uploaded to your application. If you already keep other files in a folder with that name, move them, or point `emojis.dir` in `seedcord.config.ts` at an empty folder.
