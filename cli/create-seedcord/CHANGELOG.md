# create-seedcord

## 0.2.0

### Minor Changes

- 554129a: New projects get `eslint.config.ts` (and `jiti` as a dev-dep for it) and `prettier.config.ts`. No more `.mjs` files.

## 0.1.3

### Patch Changes

- 191add9: A scaffolded project gets an `fmt:check` script.

## 0.1.2

### Patch Changes

- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- 2476bae: Show the actual CLI version in the TUI top left, and transport version as a row in the status block. Also show 'seedcord create' in the `create-seedcord` banner.

## 0.1.1

### Patch Changes

- 8e8e952: _Kinda BREAKING?:_ `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`.
- a280b87: Fixed a failing git command deleting the whole project. The scaffold now reports the reason and leaves the project in place.
- 555831d: Fixed git commands failing on Windows. Also fixed the install steps to stop printing a Node deprecation warning.
- 92b9e0a: New projects ship a `.vscode/extensions.json` recommending the eslint and prettier extensions.
- 527a465: Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%.
- bb6f212: Fixed the `prettier/prettier` rule ignoring your `prettier.config.mjs` and enforcing the seedcord defaults. Editing that file now changes what both prettier and eslint expect.

## 0.1.0

### Minor Changes

- dfd7dc2: Scaffold a new bot with `pnpm create seedcord`.
