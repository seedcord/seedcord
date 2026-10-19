---
'@seedcord/utils': patch
---

Added `readFiles` to `@seedcord/utils/node` for bots and plugins that read json, markdown, images, or other non-code files from a folder that `files` in `seedcord.config.ts` lists, in dev and in a built bot alike. Each file comes back as a `Buffer`, and `bytes.toString()` turns a text file into a string.
