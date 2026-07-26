---
'@seedcord/gateway': patch
---

A throwing `core.bus.on()` listener no longer escapes `publish` or skips the listeners after it, and each listener error is caught and logged. The same guard covers the `error:unhandled:interaction` and `error:unhandled:event` emits, where a throwing listener became an unhandled rejection.

A listener that threw during a fault report also left the duplicate-fault throttle unstamped, so every repeat of that fault reported again.
