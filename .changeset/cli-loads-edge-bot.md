---
'seedcord': minor
---

`seedcord codegen` and `build` now load an edge bot with Cloudflare's `workerd` conditions. An edge-only plugin attaches during the load, and an import from `cloudflare:workers` gets the shell's environment as `env`, the same environment envapt reads.
