# create-seedcord

## 0.6.1

### 🩹 Patch

- The `AGENTS.md` in a new project now tells agents to start the dev server without being asked, keep its stdin open, and read any warnings it logs. ([`d6b04e5`](https://github.com/seedcord/seedcord/commit/d6b04e5fc2bceecebafe23ae72a91eff49f20f85))

## 0.6.0

### 💥 Breaking

- `seedcord codegen` now writes `seedcord-gen.ts` in place of `seedcord-gen.d.ts`, and `tc` reports a plugin row that doesn't match its plugin's `codegen()`. Delete the old file, run codegen once, and rename it in your eslint ignores, `.prettierignore`, `.gitattributes`, and editor settings. ([#427](https://github.com/seedcord/seedcord/pull/427))

### ✨ Minor

- New projects now start with `seedcord make` templates for a slash command, a button, a select menu, a modal, and on gateway an event, plus a `make` script to run it. ([#425](https://github.com/seedcord/seedcord/pull/425))
- A new project now has an `ask` script that runs `seedcord ask`, and its `AGENTS.md` instructs a coding agent to search the guide before it writes something by hand that seedcord already ships. ([#440](https://github.com/seedcord/seedcord/pull/440))

### 🩹 Patch

- A new project's `AGENTS.md` now tells a coding agent to try a change by running `dev` in the background, driving it over stdin, and asking you to run the command in Discord. ([`f911ad1`](https://github.com/seedcord/seedcord/commit/f911ad1835bcdf65ce1031fad231fd73ba4cb6dd))
- A new edge bot now gets `@cloudflare/vite-plugin@2.0.0-beta.v.8` and `cf@1.0.0-beta.26`. ([`f8ba5ff`](https://github.com/seedcord/seedcord/commit/f8ba5ff9f49c827339a323b7029a15ac9a06e63a))
- Fixed `--dir` on a folder create-seedcord can't read. It now reports node's error as a bad `--dir` answer and tells you to pick a folder you can create files in. ([#425](https://github.com/seedcord/seedcord/pull/425))
- Fixed `pnpm create seedcord@next` installing the stable `seedcord` and transport packages. It now installs the `next` release of both. ([#431](https://github.com/seedcord/seedcord/pull/431), thanks [@KTrain5169](https://github.com/KTrain5169))
- Fixed the generated `package.json` missing its dependencies when you skipped the install step. ([#431](https://github.com/seedcord/seedcord/pull/431), thanks [@KTrain5169](https://github.com/KTrain5169))
- Fixed a new bot on Windows getting an exact `vite` version, because cmd removed the `^` from `vite@^8.3.4` during the install. ([#431](https://github.com/seedcord/seedcord/pull/431), thanks [@KTrain5169](https://github.com/KTrain5169))

## 0.5.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- `create-seedcord` no longer asks for the public key, and `--public-key` and `--no-public-key` have been removed. An http bot now reads the key from Discord at startup. ([#381](https://github.com/seedcord/seedcord/pull/381))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `create-seedcord` no longer asks for a language, and `--language` now fails as an unknown option. Every new project is TypeScript, as it always was. ([#371](https://github.com/seedcord/seedcord/pull/371), thanks [@SerenModz21](https://github.com/SerenModz21))

### ✨ Minor

- `create-seedcord` now asks whether to install dependencies and set up git. Pass `--install` or `--no-install`, and `--git` or `--no-git`, to answer from the command line. Its questions and progress output now look like the `seedcord` CLI's, and each answer stays on screen as a short row. ([#400](https://github.com/seedcord/seedcord/pull/400))
- A new node bot's `seedcord.config.ts` now sets its start file through `build.start`, and the project no longer gets a `tsconfig.build.json` (#359). ([#407](https://github.com/seedcord/seedcord/pull/407))
- A new bot now has `commands`, `commands:deploy` and `check` scripts. `check` runs the type check, lint and format check in a row. ([#404](https://github.com/seedcord/seedcord/pull/404))
- `create-seedcord` now asks where an http bot runs, and `--runtime edge` makes one for Cloudflare Workers with a `cloudflare.config.ts` and a `deploy` script. An edge bot made with Bun runs the `seedcord` CLI on Node, since Cloudflare's config loader throws on Bun. ([#404](https://github.com/seedcord/seedcord/pull/404))
- A failed step in `create-seedcord` now prints the command that failed in bold and its output in color under its row, with stack frames left out. Pass `--verbose` to show them. ([#400](https://github.com/seedcord/seedcord/pull/400))
- `create-seedcord` now asks for the servers to test your commands in, or reads them from `--testing-guilds`, and writes them to `TESTING_GUILD_IDS` in `.env`. The new `bot.ts` deploys commands to those servers and no longer sets `Envapter.baseDir` (#403). ([#404](https://github.com/seedcord/seedcord/pull/404))
- A new bot now installs `vite` at the range `seedcord` takes as a peer, and its `tsconfig.json` types `import.meta.env` through `vite/client`. ([#404](https://github.com/seedcord/seedcord/pull/404))
- A new project now gets a `.gitattributes` that marks `seedcord-gen.d.ts` as generated and checks text files out with LF line endings. ([#369](https://github.com/seedcord/seedcord/pull/369), thanks [@SerenModz21](https://github.com/SerenModz21))
- A new project now has a `src/plugins` folder with a sample `Uptime` plugin, and `/ping` replies with the time the bot started. Its `tsconfig.json` maps `#src/*`, `#components/*` and `#plugins/*` to those folders under `src`. ([#376](https://github.com/seedcord/seedcord/pull/376), thanks [@TheDanikReal](https://github.com/TheDanikReal))

### 🩹 Patch

- The `AGENTS.md` in a new bot links the guide's Writing plugins pages, which moved. ([#413](https://github.com/seedcord/seedcord/pull/413))
- Fixed the commands `create-seedcord` prints at the end of a run, where a hex color like `#fe565a` or a folder with a space broke the paste in bash. A folder path with `$`, a backtick, a double quote, `!`, or `%` is now refused, because no quoting keeps those whole in every shell. ([#400](https://github.com/seedcord/seedcord/pull/400))
- `create-seedcord` now downloads 211 kB, down from 385 kB. ([#400](https://github.com/seedcord/seedcord/pull/400))
- An interactive run of `create-seedcord` now ends with a line asking for a star on GitHub. ([#404](https://github.com/seedcord/seedcord/pull/404))
- Fixed `pnpm lint` and `pnpm fmt` failing on Windows in a new bot, because cmd.exe kept the `'` quotes around `'src/**/*.ts'`. In a bot you already made, swap those quotes for `\"` in `package.json`. ([#401](https://github.com/seedcord/seedcord/pull/401))
- Fixed every `pnpm install` failing with `ERR_PNPM_IGNORED_BUILDS` in a bot scaffolded with pnpm. The scaffold now writes a `pnpm-workspace.yaml` that skips the `unrs-resolver` install script. ([#385](https://github.com/seedcord/seedcord/pull/385), thanks [@TheDanikReal](https://github.com/TheDanikReal))
- A new project now sets its folder paths relative to `root`, like `path: './handlers'`. ([#382](https://github.com/seedcord/seedcord/pull/382))
- Fixed the scaffold's `.gitignore` leaving a `logs` folder inside `src` out of your commits. It now ignores only the `logs` folder at the project root. ([#359](https://github.com/seedcord/seedcord/pull/359))
- New projects now open `.seedcord/` read-only in VS Code, the same as `seedcord-gen.d.ts`. ([#386](https://github.com/seedcord/seedcord/pull/386))
- Fixed the token check accepting a bot token whose first part holds no application id. A bot now throws `ConfigInvalidEnv` for it at startup, and `create-seedcord` asks for the token again. ([#411](https://github.com/seedcord/seedcord/pull/411))
- Fixed the token check rejecting tokens of apps made before October 2015, which have 17-digit application ids. ([#411](https://github.com/seedcord/seedcord/pull/411))

## 0.4.2

### 🩹 Patch

- `bun create seedcord` writes a `bunfig.toml` that runs `bun run dev` and the other scripts on Bun. ([#357](https://github.com/seedcord/seedcord/pull/357))
- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

## 0.4.1

### 🩹 Patch

- The scaffolded `AGENTS.md` now tells a coding agent to not use seedcord's `/internal` import paths. ([`9dc8b19`](https://github.com/seedcord/seedcord/commit/9dc8b191723a547ac29c3bcc356f22a8e35cea98))

## 0.4.0

### ✨ Minor

- You can now leave the bot token and the http public key empty during setup. Press Enter twice on the empty prompt, or pass `--no-token` or `--no-public-key`, then fill the key into `.env` before running your bot for the first time. ([#342](https://github.com/seedcord/seedcord/pull/342), thanks [@camdzic](https://github.com/camdzic))

### 🩹 Patch

- A new bot's `AGENTS.md` now points agents at the plugin guide pages for anything that holds a connection, keeps state between interactions, or runs in the background. ([#340](https://github.com/seedcord/seedcord/pull/340))
- A new bot's `AGENTS.md`, its README and the closing message now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))

## 0.3.3

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

## 0.3.2

### 🩹 Patch

- Fixed the reproduce command printed at the end of a scaffold. Because it left the version off, running it later could install a different create-seedcord. ([#327](https://github.com/seedcord/seedcord/pull/327))
- Added `--version` and `-v`. Both used to throw a usage error. ([#327](https://github.com/seedcord/seedcord/pull/327))
- Fixed the scaffold reading a skipped build script as an install failure. pnpm exits non-zero there with every package already installed. ([#327](https://github.com/seedcord/seedcord/pull/327))
- Fixed `pnpm lint` failing in a new project. The scaffold installs `eslint` now. ([#327](https://github.com/seedcord/seedcord/pull/327))
- Fixed a failed dependency install cutting the run short. You now get the cause, the usual summary, and a non-zero exit code. ([#327](https://github.com/seedcord/seedcord/pull/327))

## 0.3.1

### 🩹 Patch

- The .vscode/settings.json file will mark the typegen file as read-only in VS Code and exclude it from search and their file watcher. ([#325](https://github.com/seedcord/seedcord/pull/325), thanks [@KTrain5169](https://github.com/KTrain5169))
- Keep the scaffolded project when install fails. Most notably, this allows sidestepping pnpm's postinstall scripts restrictions failing builds and wiping the scaffold. ([#324](https://github.com/seedcord/seedcord/pull/324), thanks [@KTrain5169](https://github.com/KTrain5169))

## 0.3.0

### ✨ Minor

- A scaffolded project now carries an `AGENTS.md`, with a `CLAUDE.md` pointing at it. ([#320](https://github.com/seedcord/seedcord/pull/320))

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
