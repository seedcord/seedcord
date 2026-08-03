---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

**BREAKING:** `core.bot` no longer emits events. The four keys moved to `core.bus` as `unhandledInteractionError`, `unhandledEventError`, `anyEvent`, and `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber.

`interactionDispatched` and `responseAttempted` are new, and both carry `interactionId` so a subscriber can join them to calculate durations such as network time. `publish` rejects the framework's own keys.

**BREAKING:** `AllSubscriptions` is no longer exported. Type a payload with `SubscriptionData<K>` if needed.
