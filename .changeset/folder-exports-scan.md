---
'@seedcord/core': minor
---

`FolderExports` now has `scan()`, which returns the exports that `is` accepts without registering them. Call it from a plugin's `codegen()`, which runs without `init()`.
