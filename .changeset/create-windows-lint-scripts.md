---
'create-seedcord': patch
---

Fixed `pnpm lint` and `pnpm fmt` failing on Windows in a new bot, because cmd.exe kept the `'` quotes around `'src/**/*.ts'`. In a bot you already made, swap those quotes for `\"` in `package.json`.
