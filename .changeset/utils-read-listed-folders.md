---
'@seedcord/utils': minor
---

Under `seedcord dev` and in a built bot, `readTextFiles` now throws `CoreDirectoryNotListed` for a folder that `files` in `seedcord.config.ts` leaves out, and `CorePathOutsideRoot` for a folder outside `root`.
