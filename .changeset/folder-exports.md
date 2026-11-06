---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `HmrModuleHandler` is now `FolderExports`, exported from `@seedcord/core` and both transport packages, and `@seedcord/core/hmr` has been removed. Each instance takes one `dir` plus `is`, `register`, `unregister`, and `logger`, and its `load()` replaces your own `importFiles` loop that used `trackHandler()`.
