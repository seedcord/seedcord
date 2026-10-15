---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** `CliCleanAppFetchFailed` is removed. `seedcord commands clean` now throws `CliApplicationUnreadable` when the token cannot read the application, the same code `seedcord build` throws.
