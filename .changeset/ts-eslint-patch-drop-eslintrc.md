---
'@seedcord/eslint-config': minor
---

drop dead `@eslint/eslintrc` dep. bump `typescript-eslint` and `@typescript-eslint/*` to `^8.59.4` for ts6 readiness, plus free patch bumps on `eslint-plugin-prettier` and `eslint-plugin-tsdoc`. no rule changes, but the upgraded type-checker may surface a few new autofixable `no-unnecessary-type-assertion` findings.
