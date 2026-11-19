---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Added `interactionDispatching`, which the bus publishes when an interaction dispatch starts. `unhandledInteractionError` now includes the `interactionId`, and `unhandledEventError` now includes the event `name`.
