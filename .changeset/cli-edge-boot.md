---
'seedcord': minor
---

`seedcord build` now starts the built edge worker once in workerd, and stops with workerd's error when it fails to load. It also stops when `cloudflare.config.ts` turns Node compat off.
