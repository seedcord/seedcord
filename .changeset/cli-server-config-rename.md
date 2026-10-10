---
'seedcord': minor
---

**BREAKING:** `SeedcordDevConfig` is now `SeedcordServerConfig`, the type of `seedcord.config.ts` for a bot that runs on node or bun. Change any import of `SeedcordDevConfig` to the new name.
