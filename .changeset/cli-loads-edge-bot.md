---
'seedcord': minor
---

`seedcord codegen` and `build` now load an edge bot under Cloudflare's `workerd` conditions, so an edge-only plugin or `env` from `cloudflare:workers` works there. `env` holds the text, json and secret bindings the worker declares, with values from your local env files.
