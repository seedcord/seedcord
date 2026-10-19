---
'@seedcord/utils': patch
---

Fixed `seedcord dev` reading `outDir`, the logs folder and project files like `package.json` when `importFiles` or `readFiles` walks a folder that holds them. A built bot leaves the same files out.
