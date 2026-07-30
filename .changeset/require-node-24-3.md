---
'@seedcord/event-emitter': patch
'@seedcord/gateway': patch
'@seedcord/errors': patch
'@seedcord/rate-limiter': patch
'@seedcord/types': patch
'@seedcord/utils': patch
'seedcord': patch
---

Raise `engines.node` to `>=24.3`, the floor for the `Error.isError` calls the framework uses.
