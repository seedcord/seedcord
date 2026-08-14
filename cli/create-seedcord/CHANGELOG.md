# create-seedcord

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
