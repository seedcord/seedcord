---
'@seedcord/core': patch
---

Fixed `kv.update()` hanging on Cloudflare Workers when a handler started it without awaiting it. Because Workers freezes that update once the request ends, every later update to the same key waited on it forever in that isolate.
