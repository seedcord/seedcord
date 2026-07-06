# @seedcord/eslint-config

## 1.5.0-next.2

### Patch Changes

- Updated dependencies [7174db3]
    - eslint-plugin-discordjs@0.1.0-next.1
    - @seedcord/eslint-plugin@0.1.0-next.1

## 1.5.0-next.1

### Minor Changes

- 9650385: Add `registerDiscordjsPlugin` and `registerSeedcordPlugin` options. `registerDiscordjsPlugin` applies `eslint-plugin-discordjs`'s recommended preset, `registerSeedcordPlugin` applies `@seedcord/eslint-plugin`'s. The seedcord preset includes `no-djs-builder-import`, which bans discord.js component builder imports in favor of `@discordjs/builders`.

### Patch Changes

- 9650385: Split the config content into a private bundled base package. No consumer-visible change.
- 9650385: Keep the TypeScript rule set applied when `registerTsdocPlugin` is off. The tsdoc toggle now controls only `tsdoc/syntax`.
- Updated dependencies [9650385]
- Updated dependencies [9650385]
    - @seedcord/eslint-plugin@0.1.0-next.0
    - eslint-plugin-discordjs@0.1.0-next.0

## 1.5.0-next.0

### Minor Changes

- c046193: Replace `eslint-plugin-import` with the maintained `eslint-plugin-import-x` fork, which fixes the `import/order` autofixer crashing under eslint 10 (the original calls the removed `getTokenOrCommentBefore` API). It uses import-x's faster `resolver-next` resolver and adds `no-rename-default`. Import rule and setting names move from the `import/` namespace to `import-x/`, so update any `import/*` overrides or disable comments to `import-x/*`.

    A disabled plugin now also drops its rules. Turning a plugin off (for example `registerImportPlugin: false`) previously left its rules in the config, which threw "rule not found" unless another config registered that plugin.

- c046193: Support eslint 10. `eslint` moves from `dependencies` to `peerDependencies` at `^9.39.4 || ^10.6.0`, so consumers stay on eslint 9 or move to 10 as they choose. Consumers still on `eslint-plugin-react` (which breaks on eslint 10) can pin eslint 9 without conflict.
- c046193: Add a curated set of eslint-plugin-unicorn rules (correctness, modern APIs, clarity), on by default via the new `registerUnicornPlugin` option. Consumers on eslint 9 must set `registerUnicornPlugin: false`, because unicorn requires eslint >=10.4.
- 86c1299: proseWrap is now set to `never` instead of `preserve`

### Patch Changes

- c046193: The `no-restricted-syntax` bans on inline `import()` types and `as X as Y` double casts fire again, after a second rule definition had silently shadowed them. `.test.tsx` files now also receive the test-file rule exemptions.

## 1.4.3

### Patch Changes

- 78377fa: update LICENSE copyright year

## 1.4.3-next.0

### Patch Changes

- 78377fa: update LICENSE copyright year

## 1.4.2

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).

## 1.4.2-next.0

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).

## 1.4.1

### Patch Changes

- 6e39348: tiny fix in tsdocs

## 1.4.1-next.0

### Patch Changes

- 6e39348: tiny fix in tsdocs

## 1.4.0

### Minor Changes

- 5a529d5: new opt-in mdx lint. pass `mdxFiles` (e.g. `['**/*.mdx']`) to `createConfig` to register the `eslint-mdx` parser + `mdx` plugin and run core `no-unused-expressions` on embedded js/jsx; omit to disable, same as `tailwindEntryPoint`. no `mdx/remark` prose bridge, markdownlint already covers that. also adds a separate `@seedcord/eslint-config/prettier` export with `createPrettierConfig({ tailwind })` that layers in `prettier-plugin-tailwindcss` (now an optional peer); class sorting defaults to the `cn`/`tw` helpers with no attribute scanning, and the eslint `tailwindCalleeFunctions` default is narrowed to `['cn']` to match.
- a34366b: new opt-in tailwind canonical-class autofix lint. pass `tailwindEntryPoint` to `createConfig` to enable; off otherwise. autofixes shorthand combining (`h-N w-N` → `size-N`), arbitrary-value normalization, and v4 modifier position. also exports `resolveSharedTailwindEntry` for shared packages without their own `globals.css`. `tailwindcss` is now an optional peer.
- fe77998: drop dead `@eslint/eslintrc` dep. bump `typescript-eslint` and `@typescript-eslint/*` to `^8.59.4` for ts6 readiness, plus free patch bumps on `eslint-plugin-prettier` and `eslint-plugin-tsdoc`. no rule changes, but the upgraded type-checker may surface a few new autofixable `no-unnecessary-type-assertion` findings.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 5ab61d1: add option to pass general ignores for files using glob patterns
- d938005: bump deps
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.

## 1.4.0-next.0

### Minor Changes

- 5a529d5: new opt-in mdx lint. pass `mdxFiles` (e.g. `['**/*.mdx']`) to `createConfig` to register the `eslint-mdx` parser + `mdx` plugin and run core `no-unused-expressions` on embedded js/jsx; omit to disable, same as `tailwindEntryPoint`. no `mdx/remark` prose bridge, markdownlint already covers that. also adds a separate `@seedcord/eslint-config/prettier` export with `createPrettierConfig({ tailwind })` that layers in `prettier-plugin-tailwindcss` (now an optional peer); class sorting defaults to the `cn`/`tw` helpers with no attribute scanning, and the eslint `tailwindCalleeFunctions` default is narrowed to `['cn']` to match.
- a34366b: new opt-in tailwind canonical-class autofix lint. pass `tailwindEntryPoint` to `createConfig` to enable; off otherwise. autofixes shorthand combining (`h-N w-N` → `size-N`), arbitrary-value normalization, and v4 modifier position. also exports `resolveSharedTailwindEntry` for shared packages without their own `globals.css`. `tailwindcss` is now an optional peer.
- fe77998: drop dead `@eslint/eslintrc` dep. bump `typescript-eslint` and `@typescript-eslint/*` to `^8.59.4` for ts6 readiness, plus free patch bumps on `eslint-plugin-prettier` and `eslint-plugin-tsdoc`. no rule changes, but the upgraded type-checker may surface a few new autofixable `no-unnecessary-type-assertion` findings.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 5ab61d1: add option to pass general ignores for files using glob patterns
- d938005: bump deps
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.

## 1.3.3

### Patch Changes

- f8fbe70: bump general dependencies
- allow disabling tseslint (typescript-eslint) rule registration

## 1.3.2

### Patch Changes

- 1d8986b: bump deps

## 1.3.1

### Patch Changes

- bump eslint main dep

## 1.3.0

### Minor Changes

- 5005f2d: options to enable or disable pre-initialized plugins (in case some other eslint package you import imports the same plugin by default)

## 1.2.3

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- bfe77f6: use the provided tsconfig path for import settings

## 1.2.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps

## 1.2.1

### Patch Changes

- bump deps

## 1.2.0

### Minor Changes

- update export settings (BREAKING)

## 1.1.2

### Patch Changes

- 8a7591a: bump deps

## 1.1.1

### Patch Changes

- 63fcf6f: refactor exports and remove unused dep

## 1.1.0

### Minor Changes

- 5ad6c49: port to typescript and use build tool

### Patch Changes

- aef9b78: move devDeps to deps and clean up exports
- 5ac7d83: cleanup package files and bump deps

## 1.0.2

### Patch Changes

- 97ef5a1: make public

## 1.0.1

### Patch Changes

- 48a8c9b: fix repository url in package.json
- 8c4ce41: Added eslint for TSDoc
- 48a8c9b: add LICENSE to all package roots

## 1.0.1-alpha.1

### Patch Changes

- 8c4ce41: Added eslint for TSDoc

## 1.0.1-alpha.0

### Patch Changes

- 73a33a5: fix repository url in package.json
- dad89c6: add LICENSE to all package roots
