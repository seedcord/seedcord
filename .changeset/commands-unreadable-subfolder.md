---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** `seedcord codegen`, `seedcord commands` and an edge `seedcord build` now throw `CliCommandsDirUnreadable` on any folder under your commands path they can't read. They used to skip a subfolder with a warning. A class with `@RegisterCommand` whose component is not a command now throws the new `CliCommandNotACommand`.
