---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `HmrModuleHandler` is now `FolderExports`, exported from `@seedcord/core` and both transport packages, and `@seedcord/core/hmr` has been removed. Its `load()` replaces the startup loop you wrote with `importFiles` and `trackHandler()`, so your plugin's `init()` becomes one call. Each instance covers one folder, and `unregister` receives only the class since `getArtifacts` no longer exists.
