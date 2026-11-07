---
'@seedcord/core': minor
---

Added the `Stored` type to the public exports. It describes a record after a `KvCollection` reads it back, so a plugin that stores a record can type the value that it gets back.
