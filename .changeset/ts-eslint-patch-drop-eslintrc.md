---
'@seedcord/eslint-config': minor
---

Drop dead `@eslint/eslintrc` dependency (verified unused; seedcord has been flat-config-only for a while). Bump `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, and `typescript-eslint` to `^8.59.4` for full TypeScript 6 support readiness. Free patch bumps on `eslint-plugin-prettier` (`^5.5.5`) and `eslint-plugin-tsdoc` (`^0.5.2`).

No rule additions or removals; consumers of `@seedcord/eslint-config` may see a handful of new `@typescript-eslint/no-unnecessary-type-assertion` findings caught by the upgraded type-checker integration. All such findings in the seedcord repo were autofixable.
