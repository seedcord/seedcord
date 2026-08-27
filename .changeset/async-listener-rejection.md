---
'@seedcord/event-emitter': patch
---

An async `on()` listener that throws used to crash the process. Its error now reaches `onListenerError`, the same as a synchronous one.
