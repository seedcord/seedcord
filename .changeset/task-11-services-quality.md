---
'@seedcord/services': minor
---

CoordinatedShutdown and CoordinatedStartup now extend StrictEventEmitter, so `on`/`off` are typed per event and the `CoordinatedShutdownEventKey` / `CoordinatedStartupEventKey` types are removed. The static `Logger.Error/Info/Warn/Debug/Silly` helpers are removed; use a `Logger` instance. `StrictEventEmitter.waitFor` rejects with a `SeedcordError` instead of a bare `Error`. Also fixes a HealthCheck shutdown hang, a logger-transport leak on reconfigure, and drops the unused `discord.js` dependency.
