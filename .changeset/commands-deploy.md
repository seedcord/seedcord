---
'seedcord': minor
---

Added `seedcord commands deploy` to replace the commands in the global scope and in every guild your code targets, after printing what each one gains and loses and asking first. In CI, or anywhere without a terminal, pass `--yes` to deploy without asking. An edge bot needs `seedcord build` again afterwards to pick up the new command ids.
