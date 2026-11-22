---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'@seedcord/utils': patch
'@seedcord/types': patch
---

Added `seedcord emojis` to upload the images in an `emojis` folder beside `seedcord.config.ts` to your application, and to list, download and delete the emojis already there. Each file becomes a typed `Emojis` key, like `Emojis.PartyParrot` for `party_parrot.png`, without a `bot.emojis` entry. Set `emojis.dir` in the config to keep the folder somewhere else.
