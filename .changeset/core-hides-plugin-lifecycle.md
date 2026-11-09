---
'@seedcord/core': minor
'seedcord': minor
---

`seedcord codegen` now leaves a plugin's lifecycle methods out of `this.core.<key>`, so `this.core.db.init()` no longer compiles in a handler. You should not have been using these directly anyway.
