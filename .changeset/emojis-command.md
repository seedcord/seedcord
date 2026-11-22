---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'@seedcord/utils': patch
---

Added `seedcord emojis`, which uploads the images in an `emojis` folder beside `seedcord.config.ts` as application emojis, and lists, downloads and deletes them. Each file becomes a typed `Emojis` key, like `Emojis.PartyParrot` for `party_parrot.png`, and it doesn't need a `bot.emojis` entry. Set `emojis.dir` in the config to keep the folder somewhere else.
