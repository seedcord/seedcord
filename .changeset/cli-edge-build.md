---
'seedcord': minor
---

`seedcord build` now bundles an edge bot into a Cloudflare worker at `dist/index.mjs` for `wrangler deploy` to deploy from the project folder. The project needs `@cloudflare/vite-plugin` and `wrangler` as dev dependencies, plus a `root` that points at the bot's code, like `'./src'`. A Durable Object or Workflow class that `bot.ts` exports reaches the worker too.
