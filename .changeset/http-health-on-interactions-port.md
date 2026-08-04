---
'@seedcord/core': patch
'@seedcord/http': minor
---

**BREAKING:** The http health endpoint now shares the interactions port. `healthCheck` takes a `path` only, and it is always on.
