---
'@seedcord/logger': patch
'@seedcord/utils': patch
---

Fixed the edge logger losing a `Date` passed to a log call, and spreading a class instance's fields into the top level. Both now go in `args`.
