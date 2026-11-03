---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Slash, context-menu, and component handlers now have a readonly `route` for the selected command's path, command name, or custom-ID prefix. It replaces `commandName` on context-menu handlers. Read the dispatch identifier from `this.dispatch.routeId` now, since handlers no longer have `routeId`.
