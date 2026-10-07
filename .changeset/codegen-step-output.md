---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord codegen` now prints one line per step, the same as `seedcord build`. `codegen --check` on a stale `seedcord-gen.d.ts` now throws `CliCodegenOutOfDate` with the file and the command to run.
