---
'seedcord': patch
---

Fixed `seedcord dev` ignoring saves to a source folder named `dist`, like `src/handlers/dist/`. The watcher now ignores your real `outDir`.
