---
"seedcord": minor
"@seedcord/plugins": minor
"@seedcord/types": minor
"@seedcord/services": patch
"@seedcord/utils": patch
---

Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.

- `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
- `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
- `@seedcord/types`: `discord.js` is now an optional peer dependency.
- `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).
