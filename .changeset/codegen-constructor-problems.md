---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord codegen` now reports every command whose constructor throws at once, under the new `CliCodegenCommandProblems` code. Two broken commands in `ban.ts` and `roll.ts` would both show up in one run, for example.
