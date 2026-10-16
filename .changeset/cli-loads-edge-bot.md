---
'seedcord': minor
---

`seedcord codegen` and `build` now load an edge bot with Cloudflare's `workerd` conditions. An edge bot that attaches an edge-only plugin or imports `env` from `cloudflare:workers` now loads there too. During that load, `env` and envapt hold the bindings `cloudflare.config.ts` declares, with the values the worker gets: a `bindings.text()` value as written, and a secret from `.dev.vars` or, without one, from your shell and the `.env` files for the Vite mode.
