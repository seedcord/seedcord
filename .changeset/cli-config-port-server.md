---
'seedcord': minor
---

The CLI now throws `CliConfigFieldUnused` when a node or bun bot's `seedcord.config.ts` sets `port`, which only an edge bot reads. A node bot sets its port in `new Seedcord({ port })`.
