---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

**BREAKING:** the lifecycle phases are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`.

**BREAKING:** the coordinators no longer emit events, and nothing replaces them. A task registered with `addTask` runs where the matching event fired. Gateway drains in-flight dispatch before the client disconnects.

**BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `username`, `augmentTarget`, and `start()` are gone from handlers. Read them off the instance you constructed.
