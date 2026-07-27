---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` no longer takes a logger. An unreadable directory and a file that throws while importing both reject, reporting the path.

An unreadable directory previously resolved to an empty list, which started a bot with none of its handlers registered.
