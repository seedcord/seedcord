---
'@seedcord/cli': patch
---

`seedcord build` now emits self-contained source maps (`--sourceMap --inlineSources`), so production stack traces resolve back to the original TypeScript. Run the built output with `node --enable-source-maps`.
