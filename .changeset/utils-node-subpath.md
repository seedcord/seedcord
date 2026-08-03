---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` and `isTsOrJsFile` moved to `@seedcord/utils/node`, and `traverseDirectory` no longer takes a logger.

**BREAKING:** an unreadable directory and a file that throws while importing both reject. An unreadable directory used to resolve empty, which started a bot with none of its handlers registered.
