---
'@seedcord/core': minor
'@seedcord/gateway': patch
---

Move the interaction metadata keys, the gate notices, and `RegisterCommand` from `@seedcord/gateway` to `@seedcord/core`. `@seedcord/gateway` re-exports them. `OnCooldown` is created with `resetAt` (renamed from the unpublished `expires`).
