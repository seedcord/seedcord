---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord codegen --check` now throws `CliCodegenOutOfDate` when `seedcord-gen.d.ts` is stale, naming the file and the command that rewrites it.
