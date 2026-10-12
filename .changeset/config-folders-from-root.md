---
'seedcord': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** A relative folder path in the bot config now resolves against `root` from `seedcord.config.ts`. With `root: './src'`, you would write `interactions: { path: './handlers' }` where you used to write `'./src/handlers'`, for example. An absolute path like `resolve(import.meta.dirname, './handlers')` works as before.
