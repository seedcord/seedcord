---
'seedcord': minor
'@seedcord/errors': minor
---

Fixed `seedcord commands clean` exiting with code 0 when some of its deletes failed. It now warns about each one, then throws the new `CliCommandsNotDeleted`.
