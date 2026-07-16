---
'@seedcord/http': minor
---

**BREAKING:** the `BaseHandler` class is removed from the package root, `@seedcord/core` defines it now. Import it from `@seedcord/core` instead. The type unions (`ValidInteractionTypes`, `Repliables`) are unchanged.
