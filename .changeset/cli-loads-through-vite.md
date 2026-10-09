---
'seedcord': minor
---

**BREAKING:** `seedcord build` and `codegen` now load the config and the bot through Vite, and `seedcord dev` now loads its config that way too. A `.tsx` command file now compiles with the `jsx` setting in your tsconfig. A `#` in any file or folder path in the project, like `~/code/C#/bot` or `handlers/a#b.ts`, now stops the CLI with `CliPathHasHash`, because Vite cuts a path at its first `#`.
