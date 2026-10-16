---
'seedcord': minor
---

`seedcord build` now bundles an edge bot into a Cloudflare worker in `.cloudflare/output` for `cf deploy --prebuilt`, and writes in the public key, command ids and emoji ids it reads from Discord with `DISCORD_BOT_TOKEN`. The project needs `@cloudflare/vite-plugin` and `cf` as dev dependencies, a `root` that points at the bot's code, like `'./src'`, and every command in your code deployed. The worker also exports any Durable Object or Workflow class the `instance` file exports.
