---
'seedcord': minor
---

When `cloudflare.config.ts` imports `cf/config` and the project doesn't have `cf` installed, `seedcord build` and `seedcord dev` now throw `CliDependencyMissing`, which says to add it.
