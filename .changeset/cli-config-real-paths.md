---
'seedcord': patch
---

Fixed `seedcord dev` missing saves in a project whose `root` or a folder in `files` is a symlink. Every path from `seedcord.config.ts` now resolves through its symlinks when the config loads.
