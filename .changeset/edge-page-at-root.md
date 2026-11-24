---
'seedcord': patch
---

Fixed `seedcord build` and `seedcord dev` failing for an edge bot with a page at `/`, like a dashboard's `index.html`. If your production bot has a page at `/`, point its interactions endpoint at a path like `/interactions`.
