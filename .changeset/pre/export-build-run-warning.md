---
'seedcord': patch
---

Fixed a build without `build.start` never saying that it doesn't start your bot. The `seedcord build` summary now says so, and `node dist/index.mjs` warns and tells you to set `build.start`.
