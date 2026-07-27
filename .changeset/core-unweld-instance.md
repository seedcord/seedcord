---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `this.core.username`, `this.core.augmentTarget`, and `this.core.start()` are gone from handlers. The host class still carries all four.

Gateway's `Core` narrows `shutdown` and `startup` to `addTask`. Read the rest off the instance you constructed, whose `shutdown` and `startup` are now public.

The HTTP `Core` carries neither coordinator, matching the edge runtime that has no lifecycle.
