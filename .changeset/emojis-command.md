---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'@seedcord/utils': patch
'@seedcord/types': patch
---

Added `seedcord emojis`, which uploads the images in an `emojis` folder beside `seedcord.config.ts` as application emojis and lists, downloads and deletes the ones on your application. Each file becomes a typed `Emojis` key, like `Emojis.PartyParrot` for `party_parrot.png`, without a `bot.emojis` entry. Set `emojis.dir` in the config to keep the folder somewhere else.
