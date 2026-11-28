---
'@seedcord/core': minor
---

**BREAKING:** `init()` on `Plugin` is now optional, like `ready()` and `dispose()`, so a plugin without startup work can leave it out. If your plugin defines `init()`, mark it `override` since `@seedcord/tsconfig` turns on `noImplicitOverride`.
