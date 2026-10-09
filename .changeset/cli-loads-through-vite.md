---
'seedcord': minor
---

**BREAKING:** `seedcord build`, `codegen` and `dev` now load the config and the bot through Vite. A `.tsx` command file now compiles with the `jsx` setting in your tsconfig. A project in a folder like `~/code/C#/bot` now fails with `CliPathHasHash`, because Vite cannot load a path containing `#`.
