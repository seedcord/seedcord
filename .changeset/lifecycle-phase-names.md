---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** the lifecycle phase enums are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`. An `addTask` call naming an old member moves to the new name (`ShutdownPhase.ExternalResources` becomes `ShutdownPhase.Disconnect`).

`@seedcord/gateway` drains in-flight interaction and event dispatch during shutdown before the client disconnects.
