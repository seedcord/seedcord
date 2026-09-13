# create-seedcord

## 0.2.0

### ✨ Minor

- New projects get `eslint.config.ts` (and `jiti` as a dev-dep for it) and `prettier.config.ts`. No more `.mjs` files. ([#296](https://github.com/seedcord/seedcord/pull/296))

## 0.1.3

### 🩹 Patch

- A scaffolded project gets an `fmt:check` script. ([#290](https://github.com/seedcord/seedcord/pull/290))

## 0.1.2

### 🩹 Patch

- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Show the actual CLI version in the TUI top left, and transport version as a row in the status block. Also show 'seedcord create' in the `create-seedcord` banner. ([`2476bae`](https://github.com/seedcord/seedcord/commit/2476bae))

## 0.1.1

### 💥 Breaking

- `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`. ([`8e8e952`](https://github.com/seedcord/seedcord/commit/8e8e952))

### 🩹 Patch

- Fixed a failing git command deleting the whole project. The scaffold now reports the reason and leaves the project in place. ([`a280b87`](https://github.com/seedcord/seedcord/commit/a280b87))
- Fixed git commands failing on Windows. Also fixed the install steps to stop printing a Node deprecation warning. ([`555831d`](https://github.com/seedcord/seedcord/commit/555831d))
- New projects ship a `.vscode/extensions.json` recommending the eslint and prettier extensions. ([`92b9e0a`](https://github.com/seedcord/seedcord/commit/92b9e0a))
- Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%. ([`527a465`](https://github.com/seedcord/seedcord/commit/527a465))
- Fixed the `prettier/prettier` rule ignoring your `prettier.config.mjs` and enforcing the seedcord defaults. Editing that file now changes what both prettier and eslint expect. ([`bb6f212`](https://github.com/seedcord/seedcord/commit/bb6f212))

## 0.1.0

### ✨ Minor

- Scaffold a new bot with `pnpm create seedcord`. ([#238](https://github.com/seedcord/seedcord/pull/238))
