---
'seedcord': patch
---

Fixed `seedcord build` printing dozens of `MODULE_LEVEL_DIRECTIVE` warnings for a bot that imports a React component library, one for each file with `'use client'` at the top.
