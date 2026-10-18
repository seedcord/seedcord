---
'seedcord': patch
---

Fixed `import.meta.env.VITE_*` reading as `undefined` under `seedcord dev` on a bot whose `root` is a subfolder like `./src`. It now loads the `.env` files beside `seedcord.config.ts` and ignores any in `root`.
