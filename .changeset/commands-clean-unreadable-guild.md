---
'seedcord': minor
---

**BREAKING:** `seedcord commands clean` now throws `CliCommandsUnreadable` on a guild it can't read, before it deletes anything. It used to skip that guild with a warning and clean the rest.
