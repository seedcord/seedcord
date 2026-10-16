---
'seedcord': minor
---

A `cloudflare.config.ts` beside `seedcord.config.ts` now makes the CLI treat the bot as an edge bot. An edge bot's tsconfig must now set `"customConditions": ["workerd"]`. A stray `cloudflare.config.ts` in a node bot's folder, or the condition without one, now stops `seedcord build`, `codegen` and `dev` with an error that says which file to change.
