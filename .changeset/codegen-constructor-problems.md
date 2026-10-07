---
'seedcord': minor
'@seedcord/errors': minor
---

When two or more command files fail during `seedcord codegen`, it now lists all of them in one `CliCodegenCommandProblems` error. Broken constructors in `ban.ts` and `roll.ts` would both show up in one run, for example, along with a later file that fails to import.
