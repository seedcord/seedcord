---
'seedcord': minor
---

Added `seedcord commands deploy` to replace the commands in every scope your code targets, leaving the global commands alone when your code has none. It prints what each scope gains and loses, then asks first, or needs `--yes` outside a terminal. An edge bot that gained a command needs `seedcord build` again to pick up its id.
