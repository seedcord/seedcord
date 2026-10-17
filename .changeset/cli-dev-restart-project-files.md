---
'seedcord': patch
---

Fixed `seedcord dev` ignoring a saved `.env`, `package.json` or `tsconfig.json` beside `seedcord.config.ts` on a server bot whose `root` is a subfolder like `./src`. It now asks for a restart.
