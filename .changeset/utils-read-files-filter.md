---
'@seedcord/utils': minor
---

`importFiles` and `readFiles` now take a `filter` option. If `filter` returns `false` for a file, that file is never imported or read.
