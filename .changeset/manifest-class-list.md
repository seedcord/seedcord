---
'@seedcord/http': minor
---

`createSeedcord` now takes a manifest of handler, middleware, and subscriber classes, dropping the route rows and their lazy module loading. An entry in the wrong array, or one carrying no decorator, throws while the engine builds.
