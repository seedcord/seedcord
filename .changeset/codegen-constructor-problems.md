---
'seedcord': minor
'@seedcord/errors': minor
---

When two or more command constructors throw during `seedcord codegen`, it now lists all of them in one `CliCodegenCommandProblems` error. Broken commands in `ban.ts` and `roll.ts` would both show up in one run, for example.
