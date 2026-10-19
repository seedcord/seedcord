---
'seedcord': minor
---

Added `files` to `seedcord.config.ts`, like `files: ['./locales']`, for the folders a built bot reads through `readFiles`. `seedcord build` now ships non-code files from only those folders, binary files included, and throws when one is missing.
