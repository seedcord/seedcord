---
'seedcord': minor
---

`seedcord dev` now runs an edge bot in workerd and answers Discord on the wrangler config's `dev.port`, 8787 when it's unset. Saving a handler reloads it in the running worker. Saving the wrangler config, `.dev.vars` or `.env` asks you to restart with `r`.
