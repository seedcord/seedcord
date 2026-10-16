---
'seedcord': minor
---

Added `seedcord commands deploy` to replace the commands in every scope your code targets, leaving the global commands alone when your code has none. It prints what each scope gains and loses and asks first (or needs `--yes` outside a terminal), and it skips a scope whose commands haven't changed since the last deploy unless you pass `--force`. An edge bot that gained a command needs `seedcord build` again to pick up its id.
