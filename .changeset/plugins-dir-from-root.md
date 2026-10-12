---
'@seedcord/plugin-mongoose': minor
'@seedcord/plugin-kysely-postgres': minor
---

**BREAKING:** A relative `dir` now resolves against `root` from `seedcord.config.ts`. With `root: './src'`, write `dir: './services'` where you wrote `'./src/services'`. Kysely's migrations folder resolves the same way.
