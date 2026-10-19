---
'@seedcord/utils': patch
---

Under `seedcord dev`, `importFiles` now throws `CorePathOutsideRoot` for a folder outside `root`, the same as a built bot. It used to import the folder in dev and fail only once the bot was built.
