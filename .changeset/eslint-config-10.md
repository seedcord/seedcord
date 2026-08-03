---
'@seedcord/eslint-config': minor
---

Support eslint 10. `eslint` moves to a peer dependency at `^9.39.4 || ^10.6.0`.

**BREAKING:** `eslint-plugin-import` is replaced by `eslint-plugin-import-x`, so rename any `import/*` override or disable comment to `import-x/*`. Turning a plugin off now drops its rules too.
