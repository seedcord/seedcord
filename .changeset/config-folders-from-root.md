---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** A relative folder path in the bot config now resolves against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before.
