---
'seedcord': minor
'@seedcord/errors': minor
---

When `seedcord.config.ts` has two or more missing or invalid fields, the CLI now lists all of them in one `CliConfigProblems` error. A config with no `instance` and a `tunnel` of `'yes'` would report both, for example.
