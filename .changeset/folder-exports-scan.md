---
'@seedcord/core': minor
---

`FolderExports` now has `scan()`, which returns the exports that `is` accepts without registering them. A plugin's `codegen()` can call it since `codegen()` runs without `init()`.
