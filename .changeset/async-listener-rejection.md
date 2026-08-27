---
'@seedcord/event-emitter': patch
---

An async listener that throws used to crash the process. Its error now reaches `onListenerError`, the same as a synchronous one. This covers listeners registered with both `on()` and `once()`.
