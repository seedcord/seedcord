# @seedcord/eslint-config

## 2.2.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.3.1 → 0.4.0

## 2.2.0

### ✨ Minor

- `new-cap` now requires a PascalCase name after `new`. ([`815fbb7`](https://github.com/seedcord/seedcord/commit/815fbb7))

## 2.1.0

### ✨ Minor

- `registerTypescriptConfigs` now takes `'no-type-checked'`. It keeps the presets and turns off the rules that read the type checker. ([#296](https://github.com/seedcord/seedcord/pull/296))

### 🩹 Patch

- `@typescript-eslint/naming-convention` no longer warns on an object key that holds a function. A `match` arm keys on a route string or a context menu name, both of which carry slashes and spaces. ([#292](https://github.com/seedcord/seedcord/pull/292))

## 2.0.0

### 💥 Breaking

- Prettier no longer runs as an ESLint rule. Run `prettier --check` beside `eslint`. ([#290](https://github.com/seedcord/seedcord/pull/290))
- `registerImportPlugin` takes `'all' | 'fast' | 'off'` in place of a boolean. `'fast'` skips `no-cycle` and `no-deprecated`. `IMPORT_RULES` is no longer exported. ([#290](https://github.com/seedcord/seedcord/pull/290))

## 1.5.6

### 🩹 Patch

- `createPrettierConfig` takes an `overrides` array and passes it through to prettier. ([`bd498b1`](https://github.com/seedcord/seedcord/commit/bd498b1))

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.2.1 → 0.3.0

## 1.5.5

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.2.0 → 0.2.1
- `eslint-plugin-discordjs` 0.1.3 → 0.1.4

## 1.5.4

### 🩹 Patch

- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Ignore `tests/temp` for interrupted test run artifacts. ([`0a49d85`](https://github.com/seedcord/seedcord/commit/0a49d85))

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.1.2 → 0.2.0
- `eslint-plugin-discordjs` 0.1.2 → 0.1.3

## 1.5.3

### 💥 Breaking

- `eslint-plugin-mdx`, `eslint-plugin-better-tailwindcss`, and `eslint-plugin-tailwind-canonical-classes` are optional peer dependencies now, so a project that skips `tailwindEntryPoint` and `mdxFiles` stops downloading them. Install the ones you use. ([`505af63`](https://github.com/seedcord/seedcord/commit/505af63))

### 🩹 Patch

- Fixed the `prettier/prettier` rule ignoring your `prettier.config.mjs` and enforcing the seedcord defaults. Editing that file now changes what both prettier and eslint expect. ([`bb6f212`](https://github.com/seedcord/seedcord/commit/bb6f212))

## 1.5.2

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.1.1 → 0.1.2
- `eslint-plugin-discordjs` 0.1.1 → 0.1.2

## 1.5.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.1.0 → 0.1.1
- `eslint-plugin-discordjs` 0.1.0 → 0.1.1

## 1.5.0

### 💥 Breaking

- Support eslint 10. `eslint` moves to a peer dependency at `^9.39.4 || ^10.6.0`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `eslint-plugin-import` is replaced by `eslint-plugin-import-x`, so rename any `import/*` override or disable comment to `import-x/*`. Turning a plugin off now drops its rules too.

### ✨ Minor

- Add `registerUnicornPlugin`, `registerDiscordjsPlugin`, and `registerSeedcordPlugin`. Unicorn requires eslint 10, so set `registerUnicornPlugin: false` on eslint 9. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `proseWrap` is now `never`.

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/eslint-plugin` 0.1.0 (new)
- `eslint-plugin-discordjs` 0.1.0 (new)

## 1.4.3

### 🩹 Patch

- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

## 1.4.2

### 🩹 Patch

- Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1). ([`043e2a1`](https://github.com/seedcord/seedcord/commit/043e2a1))

## 1.4.1

### 🩹 Patch

- tiny fix in tsdocs ([#143](https://github.com/seedcord/seedcord/pull/143))

## 1.4.0

### ✨ Minor

- new opt-in mdx lint. pass `mdxFiles` (e.g. `['**/*.mdx']`) to `createConfig` to register the `eslint-mdx` parser + `mdx` plugin and run core `no-unused-expressions` on embedded js/jsx; omit to disable, same as `tailwindEntryPoint`. no `mdx/remark` prose bridge, markdownlint already covers that. also adds a separate `@seedcord/eslint-config/prettier` export with `createPrettierConfig({ tailwind })` that layers in `prettier-plugin-tailwindcss` (now an optional peer); class sorting defaults to the `cn`/`tw` helpers with no attribute scanning, and the eslint `tailwindCalleeFunctions` default is narrowed to `['cn']` to match. ([`5a529d5`](https://github.com/seedcord/seedcord/commit/5a529d5))
- new opt-in tailwind canonical-class autofix lint. pass `tailwindEntryPoint` to `createConfig` to enable; off otherwise. autofixes shorthand combining (`h-N w-N` → `size-N`), arbitrary-value normalization, and v4 modifier position. also exports `resolveSharedTailwindEntry` for shared packages without their own `globals.css`. `tailwindcss` is now an optional peer. ([`a34366b`](https://github.com/seedcord/seedcord/commit/a34366b))
- drop dead `@eslint/eslintrc` dep. bump `typescript-eslint` and `@typescript-eslint/*` to `^8.59.4` for ts6 readiness, plus free patch bumps on `eslint-plugin-prettier` and `eslint-plugin-tsdoc`. no rule changes, but the upgraded type-checker may surface a few new autofixable `no-unnecessary-type-assertion` findings. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- most packages were exporting more than what they should be exporting and now have smaller imports as they should ([`7e6d80e`](https://github.com/seedcord/seedcord/commit/7e6d80e))

### 🩹 Patch

- export "version" variable with the actual semantic version of each package ([`225977a`](https://github.com/seedcord/seedcord/commit/225977a))
- add option to pass general ignores for files using glob patterns ([`5ab61d1`](https://github.com/seedcord/seedcord/commit/5ab61d1))
- bump deps ([`d938005`](https://github.com/seedcord/seedcord/commit/d938005))
- build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))

## 1.3.3

### 🩹 Patch

- bump general dependencies ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))
- allow disabling tseslint (typescript-eslint) rule registration

## 1.3.2

### 🩹 Patch

- bump deps ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))

## 1.3.1

### 🩹 Patch

- bump eslint main dep

## 1.3.0

### ✨ Minor

- options to enable or disable pre-initialized plugins (in case some other eslint package you import imports the same plugin by default) ([`5005f2d`](https://github.com/seedcord/seedcord/commit/5005f2d))

## 1.2.3

### 🩹 Patch

- improve type exports and tsdoc ([#56](https://github.com/seedcord/seedcord/pull/56))
- use the provided tsconfig path for import settings ([#50](https://github.com/seedcord/seedcord/pull/50))

## 1.2.2

### 🩹 Patch

- set up project-wide ci/cd ([#47](https://github.com/seedcord/seedcord/pull/47))
- bump deps ([`31d1a56`](https://github.com/seedcord/seedcord/commit/31d1a56))

## 1.2.1

### 🩹 Patch

- bump deps

## 1.2.0

### ✨ Minor

- update export settings (BREAKING)

## 1.1.2

### 🩹 Patch

- bump deps ([`8a7591a`](https://github.com/seedcord/seedcord/commit/8a7591a))

## 1.1.1

### 🩹 Patch

- refactor exports and remove unused dep ([`63fcf6f`](https://github.com/seedcord/seedcord/commit/63fcf6f))

## 1.1.0

### ✨ Minor

- port to typescript and use build tool ([`5ad6c49`](https://github.com/seedcord/seedcord/commit/5ad6c49))

### 🩹 Patch

- move devDeps to deps and clean up exports ([`aef9b78`](https://github.com/seedcord/seedcord/commit/aef9b78))
- cleanup package files and bump deps ([`5ac7d83`](https://github.com/seedcord/seedcord/commit/5ac7d83))

## 1.0.2

### 🩹 Patch

- make public ([`97ef5a1`](https://github.com/seedcord/seedcord/commit/97ef5a1))

## 1.0.1

### 🩹 Patch

- fix repository url in package.json ([#19](https://github.com/seedcord/seedcord/pull/19))
- Added eslint for TSDoc ([#22](https://github.com/seedcord/seedcord/pull/22))
- add LICENSE to all package roots ([#19](https://github.com/seedcord/seedcord/pull/19))
