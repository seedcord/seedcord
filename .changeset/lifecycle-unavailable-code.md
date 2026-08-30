---
'@seedcord/errors': minor
---

Add two error codes. `CoreLifecycleUnavailable` throws when a bot adds a startup or shutdown task to a core built by `createSeedcord`, and `CoreBusEmitUnavailable` throws when a bot calls `core.bus.emit`.
