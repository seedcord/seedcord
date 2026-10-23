---
'@seedcord/logger': minor
---

**BREAKING:** `new WinstonConsoleSink()` without a `format` now prints JSON lines unless the bot runs from a terminal in development. It used to print readable columns everywhere.
