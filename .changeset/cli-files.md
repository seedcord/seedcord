---
'seedcord': minor
---

Added `files` to `seedcord.config.ts`, like `files: ['./locales']`, for the folders a built bot reads through `readTextFiles`. `seedcord build` now ships non-code files from only those folders and throws when one is missing.
