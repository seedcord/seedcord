---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Read an event middleware's event name from `this.route` now, in place of `this.eventName`. Event handlers and interaction middleware now have `this.route` too, the same as interaction handlers.
