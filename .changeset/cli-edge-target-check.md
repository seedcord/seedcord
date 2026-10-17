---
'seedcord': minor
---

A `cloudflare.config.ts` beside `seedcord.config.ts` now makes the bot an edge bot, which needs `cf` installed and `"customConditions": ["workerd"]` in its tsconfig. A stray one in a node bot's folder now stops the CLI with an error that points at it.
