---
'@seedcord/errors': minor
'@seedcord/core': minor
---

**BREAKING:** `SeedcordErrorCode.UnsupportedNodeVersion` is now `UnsupportedRuntimeVersion`, still code 1008. On Bun, seedcord checks the Bun version against the minimum in `engines` and tells you to upgrade Bun.
