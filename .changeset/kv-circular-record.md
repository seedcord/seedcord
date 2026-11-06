---
'@seedcord/core': patch
'@seedcord/errors': patch
---

Fixed `set()` and `update()` on a kv collection throwing a raw `TypeError` for a record with a circular reference. They now throw a **SeedcordTypeError** with `CoreKvUnserializable` that says which key it was.
