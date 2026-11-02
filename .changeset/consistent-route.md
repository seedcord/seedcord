---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Event middleware now reads its event name from `this.route` instead of `this.eventName`, the same getter interaction handlers have. Event handlers and interaction middleware now have `this.route` too.
