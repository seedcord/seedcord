---
'seedcord': minor
---

`seedcord build` now bundles an edge bot into a Cloudflare worker at `dist/index.mjs` for `wrangler deploy`, and writes in the public key, command ids and emoji ids it reads from Discord with `DISCORD_BOT_TOKEN`. The project needs `@cloudflare/vite-plugin` and `wrangler` as dev dependencies, a `root` that points at the bot's code, like `'./src'`, and every command in your code deployed. The worker also exports any Durable Object or Workflow class the `instance` file exports.
