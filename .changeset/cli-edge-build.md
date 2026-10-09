---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord build` now bundles an edge bot into a Cloudflare worker at `dist/index.mjs` for `wrangler deploy` to deploy from the project folder. The project needs `@cloudflare/vite-plugin` and `wrangler` as dev dependencies. The build throws `CliEdgeVitePluginMissing` without the plugin, and `CliEdgeCompatDateTooOld` or `CliEdgeNodeCompatOff` when `wrangler.jsonc` leaves Cloudflare's Node compat off.
