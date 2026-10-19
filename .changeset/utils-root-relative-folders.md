---
'@seedcord/utils': minor
---

**BREAKING:** `importFiles` now resolves a relative folder against `root` from `seedcord.config.ts`. With `root: './src'`, the folder `'./handlers'` now reads `src/handlers` from any working folder. Outside `seedcord dev` and the built output, a relative folder now throws `CoreDirectoryRootUnknown`, while an absolute path works as before.
