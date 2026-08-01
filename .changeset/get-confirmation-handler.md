---
'@seedcord/gateway': minor
---

**BREAKING:** `getConfirmation` takes the handler as its first argument. Pass `this` where you passed `this.event`.

The prompt now sends through the handler's own sender, so it carries the dispatch route id and publishes to the bus.
