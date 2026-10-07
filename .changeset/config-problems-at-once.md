---
'seedcord': minor
'@seedcord/errors': minor
---

The CLI now reports every missing or invalid field in `seedcord.config.ts` at once, under the new `CliConfigProblems` code. A config with no `instance` and a `tunnel` of `'yes'` would list both, for example.
