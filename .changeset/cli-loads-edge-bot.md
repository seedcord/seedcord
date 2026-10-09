---
'seedcord': minor
---

`seedcord codegen` and `build` now load an edge bot with Cloudflare's `workerd` conditions. An edge bot that attaches an edge-only plugin or imports `env` from `cloudflare:workers` now loads there too. During that load, `env` and envapt both read your shell's environment.
