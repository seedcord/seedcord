---
'@seedcord/core': patch
'@seedcord/errors': minor
'@seedcord/gateway': patch
'@seedcord/http': patch
'seedcord': patch
---

Better encapsulate framework internals.

**BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.
