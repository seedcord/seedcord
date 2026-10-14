---
'seedcord': minor
---

`seedcord dev` now runs an edge bot in workerd and answers Discord on the wrangler config's `dev.port`, or on 8787 if it's unset. A saved handler reloads in the running worker. After you save the wrangler config, `.dev.vars` or `.env`, `seedcord dev` asks you to restart with `r`.
