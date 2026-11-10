---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/types': minor
'seedcord': minor
---

A plugin can now set `dispatchMembers`, an object of functions that seedcord runs once for each interaction or event. Each result becomes `this.<name>` on handlers and middleware, and as `ctx.<name>` in gates and `Notice.render`.
