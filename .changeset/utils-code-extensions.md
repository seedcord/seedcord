---
'@seedcord/utils': minor
---

**BREAKING:** `importFiles` now imports `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`. A file with one of those extensions in a folder that seedcord walks, like your handlers folder, now loads, while type declarations like `.d.mts` stay skipped.
