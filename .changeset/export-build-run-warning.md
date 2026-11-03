---
'seedcord': patch
---

Fixed `node dist/index.mjs` printing nothing on a build without `build.start`. It now warns that your bot didn't start and tells you to set `build.start`.
