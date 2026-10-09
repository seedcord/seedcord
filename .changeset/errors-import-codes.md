---
'@seedcord/errors': minor
---

**BREAKING:** Removed `CliTsImportFailed`, since `CliImportFailed` now covers every file the CLI fails to load. Added `CliPathHasHash` and `CliHashPathProblems` for one or more project paths containing `#`.
