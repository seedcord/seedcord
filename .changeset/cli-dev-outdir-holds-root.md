---
'seedcord': patch
---

`seedcord dev` and `codegen` now throw `CliConfigOutDirDeletesRoot` for an `outDir` that holds `root`, the same as `seedcord build`.
