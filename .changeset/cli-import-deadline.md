---
'seedcord': patch
---

Fixed `seedcord dev`, `build`, `codegen` and `commands` waiting forever when your bot has a top-level await that never settles. They now stop with `CoreImportFailed` once a file has been loading for 30s.
