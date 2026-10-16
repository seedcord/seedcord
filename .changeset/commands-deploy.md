---
'seedcord': minor
---

Added `seedcord commands deploy` to replace the commands in every scope your code targets, after printing what each one gains and loses and asking first. It leaves the global commands alone when your code has none, and outside a terminal it needs `--yes`. An edge bot that gained a command needs `seedcord build` again to pick up its id.
