---
'@seedcord/types': patch
'@seedcord/rate-limiter': patch
'@seedcord/gateway': patch
---

Add optional `config.store` to supply a durable rate-limiter backend, replacing the in-memory default.
