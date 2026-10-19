---
'seedcord': minor
---

Added `vitePlugins` to `seedcord.config.ts`. `seedcord dev`, `build`, `codegen` and `commands` run the Vite plugins it returns on your bot's code, like `vitePlugins: () => [yaml()]` with `@rollup/plugin-yaml` for a command that imports a `.yaml` file.
