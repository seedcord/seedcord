---
'@seedcord/core': minor
---

**BREAKING:** Fixed `Cooldown(NaN)` and `Cooldown(Infinity)` building a gate that never blocked. They now throw `InvalidDuration`, the same as `Cooldown(0)`.
