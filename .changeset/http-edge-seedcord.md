---
'@seedcord/http': minor
---

Edge bots now use `new Seedcord(config)` from `@seedcord/http` through the `workerd` export condition, and read their public key, command ids and emoji ids from the worker `seedcord build` wrote. A worker built some other way throws `CoreEdgeUnbuilt` on its first POST. Removed `createSeedcord`, the `Manifest` type, and the `@seedcord/http/edge` and `@seedcord/http/manifest` subpaths.
