---
'@seedcord/core': minor
---

**BREAKING:** Fixed `Cooldown(NaN)` and `Cooldown(Infinity)` building a gate whose window never freed. They now throw `InvalidDuration`, the same as `Cooldown(0)`.
