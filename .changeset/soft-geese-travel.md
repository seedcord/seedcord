---
'seedcord': patch
---

Fixed `seedcord codegen` throwing on an import that goes through a `compilerOptions.paths` alias. It now reads those aliases from your nearest tsconfig, the way `dev` and `build` already did.
