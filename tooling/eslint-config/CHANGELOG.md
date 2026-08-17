# @seedcord/eslint-config

## 1.5.4-next.0

### Patch Changes

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- 0a49d85: Ignore `tests/temp` for interrupted test run artifacts.
- Updated dependencies [f39cde0]
- Updated dependencies [a259cdc]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c343f4a]
- Updated dependencies [c75f837]
    - @seedcord/eslint-plugin@0.2.0-next.0
    - eslint-plugin-discordjs@0.1.3-next.0

## 1.5.3

### Patch Changes

- 505af63: _Kinda BREAKING?:_ `eslint-plugin-mdx`, `eslint-plugin-better-tailwindcss`, and `eslint-plugin-tailwind-canonical-classes` are optional peer dependencies now, so a project that skips `tailwindEntryPoint` and `mdxFiles` stops downloading them. Install the ones you use.
- bb6f212: Fixed the `prettier/prettier` rule ignoring your `prettier.config.mjs` and enforcing the seedcord defaults. Editing that file now changes what both prettier and eslint expect.

## 1.5.2

### Patch Changes

- Updated dependencies [272b729]
    - @seedcord/eslint-plugin@0.1.2
    - eslint-plugin-discordjs@0.1.2

## 1.5.1

### Patch Changes

- c567fea: Bump deps.
- c567fea: Set all packages' node floor to LTS.
- Updated dependencies [c567fea]
    - @seedcord/eslint-plugin@0.1.1
    - eslint-plugin-discordjs@0.1.1

## 1.5.0

### Minor Changes

- 789f17a: Support eslint 10. `eslint` moves to a peer dependency at `^9.39.4 || ^10.6.0`.

    **BREAKING:** `eslint-plugin-import` is replaced by `eslint-plugin-import-x`, so rename any `import/*` override or disable comment to `import-x/*`. Turning a plugin off now drops its rules too.

- 789f17a: Add `registerUnicornPlugin`, `registerDiscordjsPlugin`, and `registerSeedcordPlugin`. Unicorn requires eslint 10, so set `registerUnicornPlugin: false` on eslint 9.

    `proseWrap` is now `never`.

### Patch Changes

- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
    - @seedcord/eslint-plugin@0.1.0
    - eslint-plugin-discordjs@0.1.0

## 1.4.3

### Patch Changes

- 78377fa: update LICENSE copyright year

## 1.4.2

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).

## 1.4.1

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
