---
'seedcord': minor
---

When `cloudflare.config.ts` imports `cf/config` and the project doesn't have `cf` installed, the CLI now throws `CliDependencyMissing`, which says to add it.
