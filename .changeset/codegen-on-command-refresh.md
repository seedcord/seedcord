---
'@seedcord/cli': minor
---

`seedcord dev` regenerates the typed slash registry when you accept a command refresh, so option types track command edits without running `seedcord codegen` by hand. Codegen also logs a line before it loads your instance, since reading the commands directory constructs the bot (it never starts it, so nothing logs in or connects).
