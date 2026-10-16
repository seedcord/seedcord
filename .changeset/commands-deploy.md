---
'seedcord': minor
---

Added `seedcord commands deploy` to replace the commands in each scope your code targets, after it shows what each one gains and loses. It asks first, or needs `--yes` outside a terminal, and it skips a scope whose commands match the last deploy and whose names match Discord's unless you pass `--force`. An edge bot that gained a command needs `seedcord build` again to pick up its id.
