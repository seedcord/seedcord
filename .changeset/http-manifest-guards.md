---
'@seedcord/http': patch
---

**BREAKING:** Two rows resolving to the same route now throw on the edge path, reporting the export and the file of both. The filesystem loaders already threw.

The un-built `@seedcord/http/manifest` stub used to throw at module evaluation. It now throws when a route list is read, so the stack points at the code that read it.
