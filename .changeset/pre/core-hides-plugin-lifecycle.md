---
'@seedcord/core': minor
'seedcord': minor
---

`seedcord codegen` now leaves the members that only seedcord calls, like `init()`, out of `this.core.<key>`, so `this.core.db.init()` no longer compiles in a handler. If you pass `this.core.db` to your own function, type that parameter as `AttachedPlugin<Mongoose>`.
