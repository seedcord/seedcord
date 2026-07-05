---
'@seedcord/core': minor
'seedcord': patch
---

Move the interaction metadata keys, the djs-free gate and combinator notices, and the `RegisterCommand` decorator from `seedcord` into `@seedcord/core`. `seedcord` re-exports them, so its public surface is unchanged. `OnCooldown` (now on `@seedcord/core/internal`) is created with `resetAt`, renamed from the unpublished `expires` field.
