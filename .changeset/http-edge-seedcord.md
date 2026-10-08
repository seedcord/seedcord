---
'@seedcord/http': minor
---

An edge bot now writes `new Seedcord(config)` and imports `@seedcord/http`. The `workerd` export condition points that import at the edge build. Removed `createSeedcord`, the `Manifest` type, and the `@seedcord/http/edge` and `@seedcord/http/manifest` subpaths.
