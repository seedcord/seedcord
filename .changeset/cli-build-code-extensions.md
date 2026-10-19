---
'seedcord': patch
---

`seedcord dev`, `build` and `codegen` now load a handler or command from a `.tsx`, `.mts`, `.jsx` or `.mjs` file. The build writes each one as a `.js` file, and throws `CoreDuplicateName` for two files that would build to the same one, like `Roll.ts` and `Roll.tsx`.
