---
'@seedcord/core': patch
'@seedcord/http': minor
---

**BREAKING:** `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check.
