---
'@seedcord/utils': minor
---

**BREAKING:** `importFiles` now skips dotfiles and dot-folders, the same way a built bot does. Move a handler out of a folder like `.drafts/` to keep it loading in dev.
