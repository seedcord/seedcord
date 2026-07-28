---
'@seedcord/core': minor
---

**BREAKING:** the startup and shutdown coordinators no longer emit events. `startup:start|complete|error`, `shutdown:start|complete|error`, and the per-phase `phase:N:start|complete` keys are gone, along with the emitter base on both coordinators and on `Pluggable`. Nothing replaces them. A task registered with `addTask` runs at the same point the matching event fired.

A failed shutdown now logs every phase failure on its `Coordinated shutdown failed` error line. The `AggregateError` payload built for the removed `shutdown:error` event is gone.
