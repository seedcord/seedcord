---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `port` and `healthCheck` are now one `server` block on gateway and node http bots, like `server: { port: 8080, health: '/healthz' }`. `healthCheck: false` becomes `server: { health: false }`, and `port: false` becomes `server: { port: false }`. A gateway bot's server now listens on port 3000 by default, where it used 6967.
