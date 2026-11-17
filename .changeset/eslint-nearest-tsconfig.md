---
'@seedcord/eslint-config': patch
---

Fixed parsing errors and unresolved imports in a workspace with one root `eslint.config.ts` and a `tsconfig.json` in each package. Each file now uses its nearest `tsconfig.json`, where it always used the one in `tsconfigRootDir` before.
