---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` now imports `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`. A file with one of those extensions in a handler or migrations folder now loads, while type declarations like `.d.mts` stay skipped.
