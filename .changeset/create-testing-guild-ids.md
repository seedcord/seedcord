---
'create-seedcord': minor
---

`create-seedcord` now asks for the servers to test your commands in, or reads them from `--testing-guilds`, and writes them to `TESTING_GUILD_IDS` in `.env`. A new bot's `bot.ts` reads that key for `commands.guilds` and no longer sets `Envapter.baseDir`.
