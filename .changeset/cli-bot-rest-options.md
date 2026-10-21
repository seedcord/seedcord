---
'seedcord': patch
---

Fixed `seedcord commands` and the `seedcord dev` tunnel reaching Discord without your bot's REST options. They now build their client from the same options as the bot, like an `api` URL set in `bot.restOptions`.
