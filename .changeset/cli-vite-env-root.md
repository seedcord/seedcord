---
'seedcord': patch
---

Fixed `import.meta.env.VITE_*` reading as `undefined` under `seedcord dev` and `seedcord build` on a bot whose `root` is a subfolder like `./src`. Both now load the `.env` files beside `seedcord.config.ts`.
