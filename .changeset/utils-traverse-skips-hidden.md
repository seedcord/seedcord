---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` now skips dotfiles and dot-folders, the same way a built bot does. Move a handler out of a folder like `.drafts/` to keep it loading in dev.
