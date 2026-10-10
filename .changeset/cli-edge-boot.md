---
'seedcord': minor
---

`seedcord build` now stops an edge build when the wrangler config leaves Cloudflare's Node compat off, and says which setting to change. It also starts the built worker once in workerd. A worker that fails to load, like one that sets a timer at global scope, stops the build with workerd's error.
