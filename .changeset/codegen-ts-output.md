---
'seedcord': minor
'create-seedcord': minor
---

**BREAKING:** `seedcord codegen` now writes `seedcord-gen.ts` in place of `seedcord-gen.d.ts`, and `tc` reports a plugin row that doesn't match its plugin's `codegen()`. Delete the old file, run codegen once, and rename it in your eslint ignores, `.prettierignore`, `.gitattributes`, and editor settings.
