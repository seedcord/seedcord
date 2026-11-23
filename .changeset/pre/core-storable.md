---
'@seedcord/core': minor
---

Added the `Storable` and `Stored` types to the public exports. A plugin can type a parameter with `Storable`, so a value that `KvCollection` can't store as JSON fails to compile, and type what it reads back with `Stored`.
