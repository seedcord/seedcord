---
'@seedcord/http': minor
---

Edge bots now use `new Seedcord(config)` from `@seedcord/http`. The `workerd` export condition points that import at the edge build. Removed `createSeedcord`, the `Manifest` type, and the `@seedcord/http/edge` and `@seedcord/http/manifest` subpaths.
