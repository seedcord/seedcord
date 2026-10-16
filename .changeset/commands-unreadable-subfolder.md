---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** `seedcord codegen` now throws `CliCommandsDirUnreadable` on any folder under your commands path it can't read. They used to skip a subfolder with a warning. A class with `@RegisterCommand` whose component is not a command now throws the new `CliCommandNotACommand`.
