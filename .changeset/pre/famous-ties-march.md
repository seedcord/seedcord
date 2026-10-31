---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Renamed context-menu handlers' `commandName` to `route` and removed handlers' `routeId`. Read the dispatch identifier from `this.dispatch.routeId`.
