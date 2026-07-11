---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` and `isTsOrJsFile` moved to the new `@seedcord/utils/node` subpath. `formatFilePath` no longer reads `node:path`, and a path outside the working directory is returned unchanged.
