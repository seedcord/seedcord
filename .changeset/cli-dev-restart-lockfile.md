---
'seedcord': patch
---

`seedcord dev` now asks for a restart when a lockfile or any `tsconfig*.json` beside `seedcord.config.ts` is saved. A `package.json` deeper in the project no longer restarts it.
