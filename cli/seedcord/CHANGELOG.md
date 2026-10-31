# seedcord

## 0.23.0-next.0

### 💥 Breaking

- An edge bot now needs `@cloudflare/vite-plugin@2.0.0-beta.v.8` and `cf@1.0.0-beta.26`. Run `pnpm add -D @cloudflare/vite-plugin@2.0.0-beta.v.8 cf@1.0.0-beta.26` in an existing edge bot. ([`f8ba5ff`](https://github.com/seedcord/seedcord/commit/f8ba5ff9f49c827339a323b7029a15ac9a06e63a))
- `seedcord codegen` now writes `seedcord-gen.ts` in place of `seedcord-gen.d.ts`, and `tc` reports a plugin row that doesn't match its plugin's `codegen()`. Delete the old file, run codegen once, and rename it in your eslint ignores, `.prettierignore`, `.gitattributes`, and editor settings. ([#427](https://github.com/seedcord/seedcord/pull/427))
- `config.store` is now `config.kv`, and your handlers and plugins read it through `core.kv` and `this.kv`. Leave it out to keep everything in memory, or pass a `KeyvDriver`, an `UnstorageDriver`, or your own driver. Import `buildKey` from your transport package, and rename any plugin attached as `kv`. ([#429](https://github.com/seedcord/seedcord/pull/429))

### ✨ Minor

- Added a `g` key to `seedcord dev` that runs codegen for the running bot without restarting it. ([`8d77737`](https://github.com/seedcord/seedcord/commit/8d77737dfbb8b8fd30ab8f54d9bdbaadb2d7b406))
- Plugins can now define `codegen()`, and `seedcord codegen` writes what it returns into `seedcord-gen.ts`. A plugin reads that back with `Generated<typeof ThePlugin>`, keyed by its `static readonly id`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- Added `seedcord make`, which writes new files from the Handlebars templates in your `templates` folder or in an installed plugin. It asks for each value the templates read. Your own helpers go under `make.helpers` in `seedcord.config.ts`. ([#425](https://github.com/seedcord/seedcord/pull/425))

### 🩹 Patch

- Fixed a relative `readFiles` or `importFiles` path throwing `CoreDirectoryRootUnknown` under `seedcord codegen`, `seedcord build`, and `seedcord commands`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- Fixed the seedcord CLI mentioning a barrel file when a command's constructor throws, if the barrel re-exports a command defined in another file. The error now points at the file that defines the command. ([#426](https://github.com/seedcord/seedcord/pull/426))
- `seedcord dev` now warns when an http bot with `port: false` runs with a quick tunnel, and links the guide's fix. ([`2c04581`](https://github.com/seedcord/seedcord/commit/2c0458198ec443fc3b23be2b6d2985cce57245f7))
- Fixed unexpected autocomplete recovery failures and compiler diagnostics being logged at `debug` instead of `error`. ([#423](https://github.com/seedcord/seedcord/pull/423))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.5.0 → 0.6.0-next.0
- `@seedcord/utils` 0.9.0 → 0.9.1-next.0
- `@seedcord/core` 0.11.0 → 0.12.0-next.0
- `@seedcord/types` 0.15.0 → 0.16.0-next.0
- `@seedcord/errors` 0.14.0 → 0.15.0-next.0

## 0.22.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- `seedcord build` now bundles the bot with Vite and empties `outDir` before it writes. It throws `CliBuildOutDirNotEmpty` when `outDir` holds anything other than an earlier `seedcord build`, like the `dist` an older version wrote. Delete that folder once after you upgrade. ([#359](https://github.com/seedcord/seedcord/pull/359))
- `seedcord build` now runs your `instance` file. Set the env that file reads at construction in CI too, because a build without it now fails. ([#359](https://github.com/seedcord/seedcord/pull/359))
- `seedcord build` now type checks with the `tsconfig.json` beside your config and no longer picks up `tsconfig.build.json`. Set `build.tsconfig` to keep using it. ([#359](https://github.com/seedcord/seedcord/pull/359))
- `entry` in `seedcord.config.ts` is now `build.start`, like `build: { start: './index.ts' }`, and `build.bootstrap` is gone (#359). The built entry is always `index.mjs` in `outDir`, and without `build.start` it default exports the bot, typed by `index.d.mts`, for your own node app to import and start. An http bot run this way should set `port: false` and pass each request from your app to `bot.fetch()`. ([#407](https://github.com/seedcord/seedcord/pull/407))
- `seedcord dev`, `codegen` and `commands` now throw `CliConfigOutDirDeletesRoot` for an `outDir` that holds `root`, the same as `seedcord build`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- The CLI now runs every bot in the Vite mode from `ENVIRONMENT`, `ENV`, `NODE_ENV` or `MODE` in your shell, so `ENV=staging pnpm build` reads `.env.staging`. With none set, `build` runs in `production` and the other commands in `development`. Any other name, like `NODE_ENV=prod`, now throws `ConfigInvalidEnv`. ([#399](https://github.com/seedcord/seedcord/pull/399))
- `seedcord build` and `codegen` now load the config and the bot through Vite, and `seedcord dev` now loads its config that way too. A `.tsx` command file now compiles with the `jsx` setting in your tsconfig. A `#` in any file or folder path in the project, like `~/code/C#/bot` or `handlers/a#b.ts`, now stops the CLI with `CliPathHasHash`, because Vite cuts a path at its first `#`. ([#365](https://github.com/seedcord/seedcord/pull/365))
- A `seedcord` command now throws `CliNotProjectInstall` when it runs from an install other than the project's own, like a global `seedcord dev`, and `CliDependencyMissing` when the project has no `seedcord`. Run it through a script in your `package.json` instead. A global `seedcord dev` used to print the bot's logs raw under the TUI, since the bot and the CLI loaded separate copies of seedcord. ([#405](https://github.com/seedcord/seedcord/pull/405))
- `SeedcordDevConfig` is now `SeedcordServerConfig`, the type of `seedcord.config.ts` for a bot that runs on node or bun. Change any import of `SeedcordDevConfig` to the new name. ([#374](https://github.com/seedcord/seedcord/pull/374))
- `vite` is now a peer dependency of `seedcord`. Run `pnpm add -D vite` if your package manager does not install peers for you. ([#402](https://github.com/seedcord/seedcord/pull/402))
- `seedcord commands --clean` is now `seedcord commands clean`, with `--guilds` for `--guild` and `--yes` for `--apply`, and `--purge` moved to `seedcord commands purge`. With flags, `clean` lists what it would delete until you pass `--yes`, however many guilds the bot is in. With no flags in a terminal it opens a wizard, and a bare `seedcord commands` asks whether to deploy, list, clean or purge. ([#396](https://github.com/seedcord/seedcord/pull/396))
- `seedcord commands clean` now throws `CoreDiscordReadFailed` on a guild it can't read, before it deletes anything. It used to skip that guild with a warning and clean the rest. ([#396](https://github.com/seedcord/seedcord/pull/396))
- The command scan in `seedcord codegen`, `dev`, `build` and `commands` now throws `CorePathUnreadable` on any folder under your commands path it can't read. It used to skip a subfolder with a warning. A class with `@RegisterCommand` whose component is not a command now throws the new `CliCommandNotACommand`. ([#396](https://github.com/seedcord/seedcord/pull/396))
- A relative folder path in the bot config, a plugin's `dir`, Kysely's migrations folder, and a folder passed to `importFiles` now resolve against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before. ([#382](https://github.com/seedcord/seedcord/pull/382))
- seedcord now needs envapt ≥9.2. Run `pnpm add envapt@latest`, then update your own envapt reads with the [v8 to v9 migration guide](https://envapt.materwelon.dev/docs/migration-v8-to-v9/). ([`99e7d64`](https://github.com/seedcord/seedcord/commit/99e7d6400b19af6db55548fd02c41ac1eb9b1737))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `importFiles`, and with it every handler, command, subscriber, service and migration folder, now loads `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`. A stray `.mjs` file left in a handler folder starts loading too. `seedcord build` writes each one as a `.js` file and throws `CoreDuplicateName` for two files that would build to the same one, like `Roll.ts` and `Roll.tsx`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Under `seedcord dev` and in a built bot, `importFiles` now throws `CorePathOutsideRoot` for a folder outside `root`. `importFiles` and `readFiles` throw `CoreDirectorySkipped` for a folder that `seedcord build` leaves out of the bot, like `./locales/.cache`, and `seedcord codegen`, `build` and `commands` run the same checks on the folders in your config. ([#410](https://github.com/seedcord/seedcord/pull/410))
- `importFiles` now skips dotfiles, dot-folders, `node_modules`, `outDir` and the logs folder, the same way a built bot does. That covers handler, command and service folders, the command scan in `seedcord codegen` and `commands`, and hot reload in `seedcord dev`. Move a handler out of a folder like `.drafts/` to keep it loading. ([#359](https://github.com/seedcord/seedcord/pull/359))

### ✨ Minor

- `seedcord build` and `codegen` now print one line per step with its time, and `build` ends with what it bundled and the commands to run the bot. Pass `--verbose` to any `seedcord` command to see the resolved config and the stack trace of a seedcord error. ([#361](https://github.com/seedcord/seedcord/pull/361))
- `seedcord build` now bundles an edge bot into `.cloudflare/output` for `cf deploy --prebuilt`, with the public key and command ids it reads from Discord written in. It then starts the worker once in workerd and stops with workerd's error when the worker fails to load. Every command in your code has to be deployed first, and an edge bot's config can't set `build.outDir` or `build.start`. ([#374](https://github.com/seedcord/seedcord/pull/374))
- `seedcord dev` now runs an edge bot in workerd on `port` from `seedcord.config.ts`, 3000 by default. A saved handler reloads in place, and a changed `cloudflare.config.ts`, `.dev.vars` or `.env` file asks for a restart with `r`. ([#391](https://github.com/seedcord/seedcord/pull/391))
- A `cloudflare.config.ts` beside `seedcord.config.ts` now makes the bot an edge bot. It needs `cf` and `@cloudflare/vite-plugin` installed, Node compat on, and `"customConditions": ["workerd"]` in its tsconfig, and the CLI loads it under Cloudflare's `workerd` conditions with `env` from `cloudflare:workers` filled from your local env files. A stray `cloudflare.config.ts` or `workerd` condition in a node bot stops the CLI with an error that points at it. ([#365](https://github.com/seedcord/seedcord/pull/365))
- A built bot now reads its `.env` files from the folder that holds `seedcord.config.ts`, whichever folder you start it from. A bun binary, or a build copied away from its `seedcord.config.ts`, reads them from the folder you start it in. `bot.ts` no longer needs `Envapter.baseDir = resolve(import.meta.dirname, '..')`, though a `baseDir` you set there still wins. ([#403](https://github.com/seedcord/seedcord/pull/403))
- Added `files` to `seedcord.config.ts`, like `files: ['./locales']` or `files: ['../assets']` beside `root`, for the folders a built bot reads through `readFiles`. `seedcord build` bundles non-code files from only those folders, binary files included, and `readFiles` throws `CoreDirectoryNotListed` for a folder `files` leaves out. A listed folder that is missing, is a file, or sits outside the folder that holds `seedcord.config.ts` throws `CliListedFolderUnusable`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Added `vitePlugins` to `seedcord.config.ts`. `seedcord dev`, `build`, `codegen` and `commands` run the Vite plugins it returns on your bot's code, like `vitePlugins: () => [yaml()]` with `@rollup/plugin-yaml` for a command that imports a `.yaml` file. A plugin that throws stops the CLI with `CoreVitePluginThrew`, and one that rewrites Vite's `seedcord` environment away throws `CliViteEnvironmentMissing` (#406). ([#402](https://github.com/seedcord/seedcord/pull/402))
- `seedcord codegen --check` now throws `CliCodegenOutOfDate` when `seedcord-gen.d.ts` is stale, naming the file and the command that rewrites it. ([#361](https://github.com/seedcord/seedcord/pull/361))
- Fixed `seedcord commands clean` exiting with code 0 when some of its deletes failed. It now warns about each one, then throws the new `CliCommandsNotDeleted`. ([#396](https://github.com/seedcord/seedcord/pull/396))
- `seedcord commands clean` now prints each guild on its own line with its commands wrapped under it, and tags a context menu command with its kind, like `Report User (user)`. With flags it prints one line per step, and a failure shows as its code and message. `--verbose` adds each command's id. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Added `seedcord commands deploy` to replace the commands in each scope your code targets, after it shows what each one gains and loses. It asks first, or needs `--yes` outside a terminal, and it skips a scope whose commands match the last deploy and whose names match Discord's unless you pass `--force`. An edge bot that gained a command needs `seedcord build` again to pick up its id. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Added `seedcord commands list` to print the commands Discord has globally and in every guild your code deploys to, plus any guild you pass with `--guilds` or every guild the bot is in with `--all-guilds`. `--verbose` adds each command's id, and `--json` prints Discord's command objects as JSON for scripts. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Added `seedcord commands purge` to delete every command globally with `--global`, in the guilds you pass with `--guilds`, or in every guild the bot is in with `--all-guilds`. It lists what it would delete until you pass `--yes`. With no flags in a terminal, it opens a wizard. ([#396](https://github.com/seedcord/seedcord/pull/396))
- The `seedcord commands` wizard now prints one line per step, the same as `seedcord build`, and each answered prompt clears itself. The guild picker searches as you type and finds a guild from its initials or with a typo. Tab now picks a row, since space goes into the search. ([#394](https://github.com/seedcord/seedcord/pull/394))
- When `seedcord.config.ts` has two or more missing or invalid fields, the CLI now lists all of them in one `CliProblems` error, like a config with no `instance` and a `tunnel` of `'yes'`. `seedcord codegen` does the same for command files whose constructors throw, like `ban.ts` and `roll.ts` in one run. ([#361](https://github.com/seedcord/seedcord/pull/361))
- `seedcord dev` now updates `seedcord-gen.d.ts` each time the bot starts. Before, commands you edited while dev was stopped kept stale types until you ran `seedcord codegen`. ([#387](https://github.com/seedcord/seedcord/pull/387))
- In a terminal too short or too narrow to show the filter chips, you can now press `f` in `seedcord dev` to open them. ([#386](https://github.com/seedcord/seedcord/pull/386))
- `seedcord dev` now saves your channel and level filters to `.seedcord/dev-prefs.json` in the project folder and reads them back on the next run. ([#386](https://github.com/seedcord/seedcord/pull/386))
- `r`, `d` and `c` in `seedcord dev` now work while the bot starts, like during a command deploy that waits on Discord's rate limit. ([#389](https://github.com/seedcord/seedcord/pull/389))
- `seedcord dev` now throws `CliDevAlreadyRunning` when another dev session runs a bot on the same Discord application, like two bot folders that read the same token. Two sessions on one application used to overwrite each other's commands and interactions endpoint. ([#411](https://github.com/seedcord/seedcord/pull/411))
- In a narrow terminal, `seedcord dev` now shows a slimmer rail, or a two-row status above the logs. Press `s` to hide the rail, and the setting carries over to the next run. ([#412](https://github.com/seedcord/seedcord/pull/412))
- In a narrow terminal, `seedcord dev` now removes the seconds, then the label, then the clock from each log line to give the message room. Press `p` to switch them between fitting the width, full, and hidden, and the setting carries over to the next run. ([#412](https://github.com/seedcord/seedcord/pull/412))
- The `seedcord dev` sidebar now shows whether the bot runs on the edge or a server, beside the transport version. ([#391](https://github.com/seedcord/seedcord/pull/391))
- `seedcord dev` now skips deploying the global commands, or one guild's commands, when they haven't changed since the last deploy and Discord has commands with the same names. It reads their ids from Discord, and stores the last deploy in `.seedcord/deployed-commands.json`. ([#398](https://github.com/seedcord/seedcord/pull/398))
- `seedcord dev` now reads `{"do":"restart"}`, `{"do":"disconnect"}`, and `{"do":"quit"}` lines from stdin when it runs without a terminal. ([#418](https://github.com/seedcord/seedcord/pull/418))

### 🩹 Patch

- Fixed `seedcord commands` and the `seedcord dev` tunnel reaching Discord without your bot's REST options. They now build their client from the same options as the bot, like an `api` URL set in `bot.restOptions`. ([#416](https://github.com/seedcord/seedcord/pull/416))
- `seedcord dev` now asks for a restart when a lockfile or any `tsconfig*.json` beside `seedcord.config.ts` is saved. A `package.json` deeper in the project now hot reloads like any other file. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Fixed `seedcord dev` ignoring a saved `.env`, `package.json` or `tsconfig.json` beside `seedcord.config.ts` on a server bot whose `root` is a subfolder like `./src`. It now asks for a restart for those, and for a saved `.env.local` or `.env.development` beside the config on any server bot. ([#402](https://github.com/seedcord/seedcord/pull/402))
- Fixed `seedcord dev` ignoring saves to a source folder named `dist`, like `src/handlers/dist/`. The watcher now ignores your real `outDir`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Fixed `seedcord dev`, `build`, `codegen` and `commands` waiting forever when your bot has a top-level await that never settles. They now stop with `CoreImportFailed` once a file has been loading for 30s. ([#399](https://github.com/seedcord/seedcord/pull/399))
- Fixed `import.meta.env.VITE_*` reading as `undefined` under `seedcord dev` on a bot whose `root` is a subfolder like `./src`. It now loads the `.env` files beside `seedcord.config.ts` and ignores any in `root`. ([#402](https://github.com/seedcord/seedcord/pull/402))
- Fixed `console` output from your bot and its libraries never showing in `seedcord dev`. It now appears in the log list and the log file under the `Console` label. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed Ctrl-D in `seedcord dev` disconnecting the bot on the first press. It now asks first, like Ctrl-C. ([#412](https://github.com/seedcord/seedcord/pull/412))
- Fixed `seedcord dev` leaving the interactions endpoint on the old application when you change the bot token. A restart now sets the tunnel's URL on the new token's application if it has changed. ([`e03cf1a`](https://github.com/seedcord/seedcord/commit/e03cf1aee8046606d1efa1783c3f18dd2c62a752))
- Fixed `q`, scrolling, and the filter keys doing nothing in `seedcord dev` while the refresh prompt waits for `y` or `n`. ([#412](https://github.com/seedcord/seedcord/pull/412))
- Fixed `seedcord dev` hot-reloading a plugin or any other file your bot file imports. It now asks you to restart, the same as when you save the bot file. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed the `seedcord dev` error card leaving out why the bot failed to start. It now lists the error from each startup task that failed. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed `seedcord dev` sending an http bot's tunnel traffic to another program on the same port. With the default quick tunnel, the bot now listens on `127.0.0.1` only. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed `seedcord dev` keeping a tunnel that never came up when you restarted on the same port. Pressing `r` now opens a fresh tunnel until one goes live. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed the `seedcord dev` uptime counter starting over at 0s when you resize a short terminal back up to show the sidebar. ([#386](https://github.com/seedcord/seedcord/pull/386))
- Fixed `seedcord dev` crashing with "Raw mode is not supported" when stdin isn't a terminal. Without a terminal, or with `CI` set to any value, it now prints plain log lines and answers its own prompts. ([`6b6f9d7`](https://github.com/seedcord/seedcord/commit/6b6f9d789da1f62c6afdcfc580cd5c5c954f431d))
- Fixed a wrapped stack frame in `seedcord dev` starting its second row at the left edge. ([#412](https://github.com/seedcord/seedcord/pull/412))
- Fixed `seedcord dev` skipping the restart prompt for an `hmr.restart` or plugin pattern written as `./config/**` or as an absolute path. Saving a matching file used to hot-reload it while the bot kept running on what it read from that file at startup. ([#383](https://github.com/seedcord/seedcord/pull/383))
- Fixed `seedcord codegen`, `seedcord build`, and `seedcord commands` each writing a log file under `logs/` in development. A bot now applies its `logger` config, along with the default log file, when `start()` runs. ([`b3d661a`](https://github.com/seedcord/seedcord/commit/b3d661a9ff02ab15c3b40aaea5dd786c79d9bc9c))
- Fixed `seedcord build` and the `seedcord dev` type check reporting TypeScript as missing in a project on TypeScript 7. ([#361](https://github.com/seedcord/seedcord/pull/361))
- Fixed `seedcord dev` on Windows never asking for a restart after you saved `bot.ts`. ([#401](https://github.com/seedcord/seedcord/pull/401))

#### 📦 Seedcord packages

- `@seedcord/core` 0.11.0-next.0 → 0.11.0
- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/event-emitter` 0.1.9-next.0 → 0.2.0
- `@seedcord/logger` 0.5.0-next.1 → 0.5.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0
- `@seedcord/utils` 0.9.0-next.1 → 0.9.0

## 0.21.5

### 🩹 Patch

- Fixed the CLI running on a Bun version older than the minimum in its `engines` field. ([#357](https://github.com/seedcord/seedcord/pull/357))
- `seedcord dev` resolves tsconfig `paths` through Vite itself, and the CLI no longer installs `vite-tsconfig-paths`. ([#357](https://github.com/seedcord/seedcord/pull/357))
- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.4 → 0.10.0
- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/event-emitter` 0.1.7 → 0.1.8
- `@seedcord/logger` 0.4.3 → 0.4.4
- `@seedcord/types` 0.14.3 → 0.14.4
- `@seedcord/utils` 0.8.16 → 0.8.17

## 0.21.4

### 🩹 Patch

- Fixed the CLI crashing on Bun before any command ran. `bun --bun seedcord build` and every other command now start. ([#356](https://github.com/seedcord/seedcord/pull/356))
- Fixed `seedcord dev` loading a second copy of `@seedcord/core` in a pnpm project for a plugin that one of your dependencies installs. ([#356](https://github.com/seedcord/seedcord/pull/356))
- Fixed the delete event in `seedcord dev` leaving out `affectedModules`. It now lists the deleted file and every file that imported it. ([#356](https://github.com/seedcord/seedcord/pull/356))
- Fixed `seedcord dev` reloading a new handler twice, because it sent an extra update after every file create or delete. ([#356](https://github.com/seedcord/seedcord/pull/356))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.3 → 0.9.4
- `@seedcord/types` 0.14.2 → 0.14.3

## 0.21.3

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/core` 0.9.2 → 0.9.3
- `@seedcord/event-emitter` 0.1.6 → 0.1.7
- `@seedcord/logger` 0.4.2 → 0.4.3
- `@seedcord/types` 0.14.1 → 0.14.2
- `@seedcord/utils` 0.8.15 → 0.8.16

## 0.21.2

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.1 → 0.9.2
- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/event-emitter` 0.1.5 → 0.1.6
- `@seedcord/logger` 0.4.1 → 0.4.2
- `@seedcord/types` 0.14.0 → 0.14.1
- `@seedcord/utils` 0.8.14 → 0.8.15

## 0.21.1

### 🩹 Patch

- Fixed `seedcord dev` failing with `Cannot read properties of undefined (reading 'setChannel')` when the bot attaches a plugin published outside the `@seedcord` scope. The dev runtime now loads that plugin through the same `@seedcord/core` as the bot. ([#336](https://github.com/seedcord/seedcord/pull/336))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0
- `@seedcord/core` 0.9.0 → 0.9.1
- `@seedcord/utils` 0.8.13 → 0.8.14
- `@seedcord/logger` 0.4.0 → 0.4.1

## 0.21.0

### 💥 Breaking

- seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property. ([#327](https://github.com/seedcord/seedcord/pull/327))

### 🩹 Patch

- The CLI no longer depends on tsx. It loads your TypeScript through jiti, the loader it already used for JavaScript. ([#327](https://github.com/seedcord/seedcord/pull/327))
- Fixed `seedcord codegen` throwing on an import that goes through a `compilerOptions.paths` alias. It now reads those aliases from your nearest tsconfig, the way `dev` and `build` already did. ([#327](https://github.com/seedcord/seedcord/pull/327))

#### 📦 Seedcord packages

- `@seedcord/core` 0.8.0 → 0.9.0
- `@seedcord/logger` 0.3.3 → 0.4.0
- `@seedcord/errors` 0.9.0 → 0.10.0
- `@seedcord/utils` 0.8.12 → 0.8.13

## 0.20.0

### ✨ Minor

- `seedcord codegen` writes one `Core` row per plugin group, so `services.users` and `services.tickets` share a single `services` row. ([#318](https://github.com/seedcord/seedcord/pull/318))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/core` 0.7.0 → 0.8.0
- `@seedcord/types` 0.13.0 → 0.14.0
- `@seedcord/utils` 0.8.11 → 0.8.12
- `@seedcord/logger` 0.3.2 → 0.3.3

## 0.19.5

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.6.0 → 0.7.0
- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/utils` 0.8.10 → 0.8.11

## 0.19.4

### 🩹 Patch

- `seedcord dev` logs a warning when the tunnel fails to stop on quit, and finishes quitting either way. ([#309](https://github.com/seedcord/seedcord/pull/309))

#### 📦 Seedcord packages

- `@seedcord/core` 0.5.0 → 0.6.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10

## 0.19.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.4.1 → 0.5.0
- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/utils` 0.8.8 → 0.8.9

## 0.19.2

### 🩹 Patch

- `seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
- `seedcord codegen` now throws and names the file when a class carrying `@RegisterCommand` fails to construct. ([#296](https://github.com/seedcord/seedcord/pull/296))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/core` 0.3.1 → 0.4.0
- `@seedcord/event-emitter` 0.1.4 → 0.1.5
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8

## 0.19.1

### 💥 Breaking

- Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`. ([#288](https://github.com/seedcord/seedcord/pull/288))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.3.0 → 0.3.1
- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.19.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.1 → 0.3.0
- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.18.2

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.0 → 0.2.1
- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.18.1

### 🩹 Patch

- Update package.json desc

## 0.18.0

### 💥 Breaking

- sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`. ([`aa6bb3a`](https://github.com/seedcord/seedcord/commit/aa6bb3a))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- `seedcord dev` and `seedcord build` now correctly resolve the `paths` a project declares in its tsconfig. The build also rewrites dynamic relative imports, which node rejected for having no extension. ([`d717336`](https://github.com/seedcord/seedcord/commit/d717336))
- Show the actual CLI version in the TUI top left, and transport version as a row in the status block. Also show 'seedcord create' in the `create-seedcord` banner. ([`2476bae`](https://github.com/seedcord/seedcord/commit/2476bae))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/core` 0.1.4 → 0.2.0
- `@seedcord/event-emitter` 0.1.2 → 0.1.3
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.17.4

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))
- `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`. ([`8e8e952`](https://github.com/seedcord/seedcord/commit/8e8e952))

### 🩹 Patch

- Add optional profiling. Enable with `SEEDCORD_DEV_PROFILE=1` ([`0738efa`](https://github.com/seedcord/seedcord/commit/0738efa))
- Fixed the channel dot in `seedcord dev` rendering as a white emoji on Windows and Linux. Also dropped the arrow from the two resize hints. ([`2efe2f7`](https://github.com/seedcord/seedcord/commit/2efe2f7))
- Ignore churn files in hmr ([`ca24b0d`](https://github.com/seedcord/seedcord/commit/ca24b0d))
- Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%. ([`527a465`](https://github.com/seedcord/seedcord/commit/527a465))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.3 → 0.1.4
- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.17.3

### 🩹 Patch

- Fix seedcord dev failing while attempting to parse decorators

## 0.17.2

### 🩹 Patch

- Fix cli bin missing shebang so npm works correctly ([#238](https://github.com/seedcord/seedcord/pull/238))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/core` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.17.1

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.1 → 0.1.2
- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.17.0

### ✨ Minor

- `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place. ([#230](https://github.com/seedcord/seedcord/pull/230))

### 🩹 Patch

- Config resolution and the tsc watch relay now log at debug and trace. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Updated gen file's comment. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A dev log line too long for the pane now wraps onto the next line, and re-wraps when the terminal resizes. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 → 0.1.1
- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/event-emitter` 0.1.0 → 0.1.1

## 0.16.0

### 💥 Breaking

- `seedcord` is the CLI. The gateway framework moved to `@seedcord/gateway`. Keep importing `defineConfig` from here. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- `seedcord codegen` writes the `Core` augmentation for every attached plugin, so `this.core.db` types with no hand-written `declare module`. It resolves each key off your bot's default export, which needs `moduleResolution: bundler`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- `seedcord dev` renders each log line as a level chip, a clock, a channel dot, and a label. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    The layout adapts to the terminal size. A short terminal collapses the filter chips, and a shorter one replaces the sidebar with a status line.

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.2 → 0.1.0
- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/event-emitter` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0

## 0.4.0-next.4

### 🩹 Patch

- The dev sidebar no longer shows the config paths and now shows the framework version. The rail width locks at the first running render of each run. ([#175](https://github.com/seedcord/seedcord/pull/175))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.1 → 0.1.0-next.2
- `@seedcord/types` 0.8.0-next.2 → 0.8.0-next.3
- `@seedcord/services` 0.9.0-next.3 → 0.9.0-next.4
- `@seedcord/utils` 0.8.0-next.2 → 0.8.0-next.3
- `@seedcord/errors` 0.3.0-next.1 → 0.3.0-next.2

## 0.4.0-next.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0-next.1 → 0.3.0-next.2
- `@seedcord/core` 0.1.0-next.0 → 0.1.0-next.1
- `@seedcord/services` 0.9.0-next.2 → 0.9.0-next.3
- `@seedcord/types` 0.8.0-next.1 → 0.8.0-next.2
- `@seedcord/utils` 0.8.0-next.1 → 0.8.0-next.2

## 0.4.0-next.2

### 💥 Breaking

- The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`. ([#169](https://github.com/seedcord/seedcord/pull/169))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.0 (new)
- `@seedcord/types` 0.8.0-next.1 → 0.8.0-next.2
- `@seedcord/services` 0.9.0-next.1 → 0.9.0-next.2
- `@seedcord/utils` 0.8.0-next.1 → 0.8.0-next.2

## 0.4.0-next.1

### 💥 Breaking

- require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer. ([#168](https://github.com/seedcord/seedcord/pull/168))

### 🩹 Patch

- Measure the `seedcord dev` layout in `useLayoutEffect` so the first frame renders at the correct size. ([#168](https://github.com/seedcord/seedcord/pull/168))
- Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change. ([#168](https://github.com/seedcord/seedcord/pull/168))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.3-next.0 → 0.9.0-next.1
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0-next.1
- `@seedcord/types` 0.7.2-next.0 → 0.8.0-next.1
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0-next.1

## 0.4.0-next.0

### ✨ Minor

- A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`. ([#163](https://github.com/seedcord/seedcord/pull/163))

### 🩹 Patch

- Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted. ([#163](https://github.com/seedcord/seedcord/pull/163))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.2 → 0.8.3-next.0
- `@seedcord/errors` 0.2.1 → 0.2.2-next.0
- `@seedcord/types` 0.7.1 → 0.7.2-next.0
- `@seedcord/utils` 0.7.0 → 0.7.1-next.0

## 0.3.1

### 🩹 Patch

- small fix in the command desc ([#154](https://github.com/seedcord/seedcord/pull/154))
- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.6.1 → 0.7.0
- `@seedcord/errors` 0.2.0 → 0.2.1
- `@seedcord/types` 0.7.0 → 0.7.1

## 0.3.0

### ✨ Minor

- Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands. ([#147](https://github.com/seedcord/seedcord/pull/147))
- Type configured emojis precisely. `seedcord codegen` now writes an `EmojiMap` block that tags each key `'application'` or `'guild'`, and `Emojis.X` (and `bot.emojis.X`) resolves to the exact `ApplicationEmoji` or `GuildEmoji` rather than the union. Configure `config.bot.emojis` with the new `EmojiConfig` type and run `seedcord codegen`, you no longer hand-write the `EmojiMap` augmentation. The generated file is renamed from `command-registry.gen.ts` to `seedcord-gen.d.ts`, so delete the old file and re-run `seedcord codegen`. ([#147](https://github.com/seedcord/seedcord/pull/147))

### 🩹 Patch

- Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1). ([`043e2a1`](https://github.com/seedcord/seedcord/commit/043e2a1))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.6.0 → 0.6.1
- `@seedcord/errors` 0.1.0 → 0.2.0
- `@seedcord/types` 0.6.0 → 0.7.0

## 0.2.1

### 🩹 Patch

- Depend on `@seedcord/errors` directly for the CLI's own throws, and correct the config-schema default-value tsdoc tags. ([#143](https://github.com/seedcord/seedcord/pull/143))

#### 📦 Seedcord packages

- `@seedcord/services` 0.7.1 → 0.8.0
- `@seedcord/errors` 0.1.0 (new)
- `@seedcord/types` 0.5.0 → 0.6.0
- `@seedcord/utils` 0.5.0 → 0.6.0

## 0.2.0

### 💥 Breaking

- Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - **BREAKING:** the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.

- Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING:** `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING:** `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.

- Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING:** slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.

- Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING:** `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.

### ✨ Minor

- `seedcord dev` regenerates the typed slash registry when you accept a command refresh, so option types track command edits without running `seedcord codegen` by hand. Codegen also logs a line before it loads your instance, since reading the commands directory constructs the bot (it never starts it, so nothing logs in or connects). ([#139](https://github.com/seedcord/seedcord/pull/139))
- Add `routeLeavesOf` to `@seedcord/utils/internal`, the single walk that turns a slash command's JSON into its route-leaf keys. `@seedcord/cli` codegen now reads route leaves from there and depends on `discord-api-types` for its API enums and types instead of the full `discord.js` runtime. ([#139](https://github.com/seedcord/seedcord/pull/139))

### 🩹 Patch

- Fix duplicate colors and misalignment in the CLI ([#139](https://github.com/seedcord/seedcord/pull/139))

#### 📦 Seedcord packages

- `@seedcord/services` 0.7.0 → 0.7.1
- `@seedcord/types` 0.4.0 → 0.5.0
- `@seedcord/utils` 0.4.0 → 0.5.0

## 0.1.0

### 💥 Breaking

- seedcord now uses a config.ts file for dev server configuration. new cli as well. ([#98](https://github.com/seedcord/seedcord/pull/98))

### ✨ Minor

- Redesign the `seedcord dev` dashboard and harden its lifecycle. ([`5a529d5`](https://github.com/seedcord/seedcord/commit/5a529d5))
    - Two-column bottom-up layout: a left rail with the wordmark, phase status, a channel filter, and the hotkey legend, beside a wide log column. Logs are frameless, tail from the bottom, and scroll back through the buffer with the arrows, PgUp/PgDn, and t/b.
    - Channels are a live enable/disable filter rather than one-at-a-time switching, and each log line shows a colored channel tag. The status badge animates while running and shows CLI-computed uptime; the log directory is shown in the rail.
    - Notifications render as cards below the logs: an error card with a bounded stack, a restart-required card, and the y/n command-refresh prompt.
    - The UI renders in the alternate screen, so the terminal and its scrollback are restored on quit, and the on-disk log path is printed on exit. Ctrl-C and `q` always quit, restart and disconnect are idempotent, `d` is a no-op when no session is running, and the Vite runtime detaches its HMR listeners on dispose.
    - Internals: import the typed `commander` surface directly (drop the `paths` alias), detect a missing entry via the filesystem rather than a Vite error string, build Windows-safe module ids, debounce HMR per file and event type, and strip stray control characters from log lines.

- bump `ink` `^6.6.0` → `^7.0.4`. requires react 19.2+ and node 22+. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- most packages were exporting more than what they should be exporting and now have smaller imports as they should ([`7e6d80e`](https://github.com/seedcord/seedcord/commit/7e6d80e))

### 🩹 Patch

- Bump `commander` and `@commander-js/extra-typings` to v15. ([`2c4201b`](https://github.com/seedcord/seedcord/commit/2c4201b))
- `seedcord build` now emits self-contained source maps (`--sourceMap --inlineSources`), so production stack traces resolve back to the original TypeScript. Run the built output with `node --enable-source-maps`. ([`7308d36`](https://github.com/seedcord/seedcord/commit/7308d36))
- build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))

#### 📦 Seedcord packages

- `@seedcord/services` 0.7.0 (new)
- `@seedcord/types` 0.3.5 → 0.4.0
- `@seedcord/utils` 0.3.8 → 0.4.0
