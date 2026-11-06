---
'@seedcord/http': patch
---

A node http bot's shutdown now also waits for the async `bus.on()` listeners and log sinks that a request started, within the same drain window.
