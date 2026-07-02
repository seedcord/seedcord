---
'@seedcord/eslint-config': patch
---

The `no-restricted-syntax` bans on inline `import()` types and `as X as Y` double casts fire again, after a second rule definition had silently shadowed them. `.test.tsx` files now also receive the test-file rule exemptions.
