---
'seedcord': minor
---

Added `files` to `seedcord.config.ts`, like `files: ['./locales']`, for the folders a built bot reads through `readFiles`. `seedcord build` now bundles non-code files from only those folders, binary files included. It throws for a listed folder that is missing or is a file, while `seedcord dev` and `build` both throw `CoreDirectorySkipped` for one the build skips, like a dot-folder.
