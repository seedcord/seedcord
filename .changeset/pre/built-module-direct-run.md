---
'seedcord': patch
'@seedcord/errors': patch
'@seedcord/utils': patch
---

Fixed `node dist/index.js` crashing with `Cannot read properties of undefined (reading 'root')` when your code reads `import.meta.dirname`. It now throws `CoreBuiltModuleRanDirectly`, which tells you to run `dist/index.mjs`.
