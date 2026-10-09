---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord build` now bundles an edge bot into a Cloudflare worker at `dist/index.mjs` through `@cloudflare/vite-plugin`, and `wrangler deploy` from the project folder deploys it. The project installs the plugin and `wrangler` as dev dependencies, and the build throws `CliEdgeVitePluginMissing` without the plugin.
