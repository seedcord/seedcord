---
'seedcord': minor
---

`seedcord dev` now runs an edge bot in workerd and answers Discord on `port` from `seedcord.config.ts`, or on 3000 if it's unset. A bot on node or bun that sets `port` there gets `CliConfigFieldUnused`. A saved handler reloads in the running worker, and after you save `cloudflare.config.ts`, a `.dev.vars` file or a `.env` file, `seedcord dev` asks you to restart with `r`.
