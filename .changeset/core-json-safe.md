---
'@seedcord/core': minor
---

Added the `JsonSafe` type to the public exports, so a plugin can reject a value at compile time when it wouldn't survive the JSON trip a `KvCollection` record takes.
