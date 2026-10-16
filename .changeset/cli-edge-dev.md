---
'seedcord': minor
---

`seedcord dev` now runs an edge bot in workerd and answers Discord on `port` from `seedcord.config.ts`, or on 8787 if it's unset. A saved handler reloads in the running worker. After you save `cloudflare.config.ts`, a `.dev.vars` file or a `.env` file, `seedcord dev` asks you to restart with `r`.
