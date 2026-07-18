---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

`@seedcord/core/node` is a new subpath exporting the lifecycle coordinators (`CoordinatedStartup`, `CoordinatedShutdown`) and `HealthCheck`, moved out of the deleted `@seedcord/services`.

**BREAKING:** the `@seedcord/gateway` barrel no longer re-exports the lifecycle coordinators, `HealthCheck`, or the lifecycle types (`LifecycleTask`, `PhaseEventMap`). `StartupPhase` and `ShutdownPhase` stay exported.
