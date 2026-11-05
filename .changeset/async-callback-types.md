---
'@seedcord/core': patch
'@seedcord/types': patch
---

`bus.on()`, `bus.once()` and `ILogSink.onLog` now take a callback that returns anything, so an async one no longer trips `no-misused-promises` and a one-liner like `(data) => seen.push(data)` still compiles.
