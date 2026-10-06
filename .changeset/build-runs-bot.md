---
'seedcord': minor
---

**BREAKING:** `seedcord build` now runs your `instance` file. Set the env that file reads at construction in CI too, because a build without it now fails.
