---
'seedcord': minor
---

A `wrangler.jsonc` beside `seedcord.config.ts` now makes the CLI treat the bot as an edge bot, and the tsconfig must then set `"customConditions": ["workerd"]`. A stray wrangler config in a node bot's folder, or the condition without a wrangler config, now stops `seedcord build`, `codegen` and `dev` with an error that says which file to change.
