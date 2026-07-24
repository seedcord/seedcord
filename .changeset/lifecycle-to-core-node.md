---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

The lifecycle coordinators (`CoordinatedStartup`, `CoordinatedShutdown`) and `HealthCheck` moved out of the deleted `@seedcord/services` into `@seedcord/core` on an internal entry.

**BREAKING:** the `@seedcord/gateway` barrel no longer re-exports the lifecycle coordinators, `HealthCheck`, or the lifecycle types (`LifecycleTask`, `PhaseEventMap`). The `StartupPhase` and `ShutdownPhase` enums stay available through `@seedcord/core`.
