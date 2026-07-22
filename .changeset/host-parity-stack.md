---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/types': minor
---

The `Plugin` base and the `attach` host machinery moved to `@seedcord/core`. The gateway barrel re-exports `Plugin`.

**BREAKING (`@seedcord/gateway`):** `attach(key, Plugin, ...args)` no longer takes a `startupPhase` argument, plugin init runs during startup. `StartupPhase` and `ShutdownPhase` are no longer exported. `shutdownEnabled` is removed, coordinated shutdown is always on. `healthCheck` is `false | true | HealthCheckConfig` (omit for the defaults) and the health server's default path is `/health`. `runtime` accepts only `'server'`.

**BREAKING (`@seedcord/types`):** `Config` removes `shutdownEnabled` and `healthCheck` (each transport config declares its own) and adds `runtime?: 'server' | 'edge'`.
