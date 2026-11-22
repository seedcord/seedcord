---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'@seedcord/utils': patch
'@seedcord/types': patch
---

Added `seedcord emojis` to upload the images in an `emojis` folder beside `seedcord.config.ts` as application emojis, and to list, download and delete the emojis on your application. Each file becomes a typed `Emojis` key, like `Emojis.PartyParrot` for `party_parrot.png`, and you don't add it to `bot.emojis`. Set `emojis.dir` in the config to keep the folder somewhere else.
