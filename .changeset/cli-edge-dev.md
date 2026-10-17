---
'seedcord': minor
---

`seedcord dev` now runs an edge bot in workerd on `port` from `seedcord.config.ts`, 3000 by default. A saved handler reloads in place, and a changed `cloudflare.config.ts`, `.dev.vars` or `.env` file asks for a restart with `r`.
