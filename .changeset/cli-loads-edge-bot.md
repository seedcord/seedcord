---
'seedcord': minor
---

`seedcord codegen` and `build` now load an edge bot with Cloudflare's `workerd` conditions. An edge bot that attaches an edge-only plugin or imports `env` from `cloudflare:workers` now loads there too. During that load, `env` and envapt read the same values the worker gets: the `bindings.text()` values in `cloudflare.config.ts`, plus `.dev.vars` or, without one, your shell and the `.env` files for the Vite mode.
