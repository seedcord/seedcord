---
'seedcord': minor
---

A `wrangler.json`, `wrangler.jsonc` or `wrangler.toml` beside `seedcord.config.ts` now makes the CLI treat the bot as an edge bot. An edge bot's tsconfig must set `"customConditions": ["workerd"]`. A stray wrangler config in a node bot's folder, or the condition without a wrangler config, now stops `seedcord build`, `codegen` and `dev` with an error that says which file to change.
