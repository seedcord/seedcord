---
'@seedcord/core': minor
---

**BREAKING:** `Cooldown(NaN)` and `Cooldown(Infinity)` now throw `InvalidDuration`, the same as `Cooldown(0)`. Before, they built a gate whose window never freed.
