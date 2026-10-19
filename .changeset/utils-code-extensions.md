---
'@seedcord/utils': patch
---

`traverseDirectory` now imports `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`, and `readFiles` now skips them. Both skip type declarations like `.d.mts`.
