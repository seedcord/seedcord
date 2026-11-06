# @seedcord/errors

## 0.15.0

### 💥 Breaking

- Read an event middleware's event name from `this.route` now, in place of `this.eventName`. Event handlers and interaction middleware now have `this.route` too, the same as interaction handlers. ([#437](https://github.com/seedcord/seedcord/pull/437))
- `config.store` is now `config.kv`, and your handlers and plugins read it through `core.kv` and `this.kv`. Leave it out to keep everything in memory, or pass a `KeyvDriver`, an `UnstorageDriver`, or your own driver. Import `buildKey` from your transport package, and rename any plugin attached as `kv`. ([#429](https://github.com/seedcord/seedcord/pull/429))
- `SeedcordErrorCode.MatchArmMissing` is now `MatchCaseMissing`, with the same number. Rename it wherever you check for it. ([`6f6cc3a`](https://github.com/seedcord/seedcord/commit/6f6cc3a4948b97969d7d42067543c4cac924eccb))
- A permission check on a bot whose own member isn't cached now throws `CoreBotMemberMissing`, where it used to refuse as if every permission were missing. `RequireBotPermissions` without `in: 'guild'` no longer compiles on an event handler, where it used to refuse every event. ([#432](https://github.com/seedcord/seedcord/pull/432))

### ✨ Minor

- Plugins can now define `codegen()`, and `seedcord codegen` writes what it returns into `seedcord-gen.ts`. A plugin reads that back with `Generated<typeof ThePlugin>`, keyed by its `static readonly id`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- Added `seedcord ask "<question>"`, which searches the guide from a terminal, even outside a project. It takes a question, a pasted error, or an error code like `3116`, and prints the matching pages with their links. ([#440](https://github.com/seedcord/seedcord/pull/440))
- Added `seedcord make`, which writes new files from the Handlebars templates in your `templates` folder or in an installed plugin. It asks for each value the templates read. Your own helpers go under `make.helpers` in `seedcord.config.ts`. ([#425](https://github.com/seedcord/seedcord/pull/425))

### 🩹 Patch

- Fixed `node dist/index.js` crashing with `Cannot read properties of undefined (reading 'root')` when your code reads `import.meta.dirname`. It now throws `CoreBuiltModuleRanDirectly`, which tells you to run `dist/index.mjs`. ([`c5ba606`](https://github.com/seedcord/seedcord/commit/c5ba60619473410e2ee65801a830f290fae6d71d))
- Reworded error messages and log lines that joined their parts with the wrong word or read two ways. ([`6f71a86`](https://github.com/seedcord/seedcord/commit/6f71a868e39df8cff3b857688544404113d46596))

## 0.14.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- `seedcord build` now bundles the bot with Vite and empties `outDir` before it writes. It throws `CliBuildOutDirNotEmpty` when `outDir` holds anything other than an earlier `seedcord build`, like the `dist` an older version wrote. Delete that folder once after you upgrade. ([#359](https://github.com/seedcord/seedcord/pull/359))
- `seedcord build` and `codegen` now load the config and the bot through Vite, and `seedcord dev` now loads its config that way too. A `.tsx` command file now compiles with the `jsx` setting in your tsconfig. A `#` in any file or folder path in the project, like `~/code/C#/bot` or `handlers/a#b.ts`, now stops the CLI with `CliPathHasHash`, because Vite cuts a path at its first `#`. ([#365](https://github.com/seedcord/seedcord/pull/365))
- A `seedcord` command now throws `CliNotProjectInstall` when it runs from an install other than the project's own, like a global `seedcord dev`, and `CliDependencyMissing` when the project has no `seedcord`. Run it through a script in your `package.json` instead. A global `seedcord dev` used to print the bot's logs raw under the TUI, since the bot and the CLI loaded separate copies of seedcord. ([#405](https://github.com/seedcord/seedcord/pull/405))
- `seedcord commands --clean` is now `seedcord commands clean`, with `--guilds` for `--guild` and `--yes` for `--apply`, and `--purge` moved to `seedcord commands purge`. With flags, `clean` lists what it would delete until you pass `--yes`, however many guilds the bot is in. With no flags in a terminal it opens a wizard, and a bare `seedcord commands` asks whether to deploy, list, clean or purge. ([#396](https://github.com/seedcord/seedcord/pull/396))
- The command scan in `seedcord codegen`, `dev`, `build` and `commands` now throws `CorePathUnreadable` on any folder under your commands path it can't read. It used to skip a subfolder with a warning. A class with `@RegisterCommand` whose component is not a command now throws the new `CliCommandNotACommand`. ([#396](https://github.com/seedcord/seedcord/pull/396))
- A relative folder path in the bot config, a plugin's `dir`, Kysely's migrations folder, and a folder passed to `importFiles` now resolve against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before. ([#382](https://github.com/seedcord/seedcord/pull/382))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `WinstonFileSink` now always writes inside the `logs` folder beside `seedcord.config.ts`, and `filename` takes only a file name. Change `filename: 'logs/bot-{date}.log'` to `filename: 'bot-{date}.log'`. A name with a folder in it throws the new `LoggerFileNameHasFolder`. ([#410](https://github.com/seedcord/seedcord/pull/410))

### ✨ Minor

- `seedcord build` now bundles an edge bot into `.cloudflare/output` for `cf deploy --prebuilt`, with the public key and command ids it reads from Discord written in. It then starts the worker once in workerd and stops with workerd's error when the worker fails to load. Every command in your code has to be deployed first, and an edge bot's config can't set `build.outDir` or `build.start`. ([#374](https://github.com/seedcord/seedcord/pull/374))
- A `cloudflare.config.ts` beside `seedcord.config.ts` now makes the bot an edge bot. It needs `cf` and `@cloudflare/vite-plugin` installed, Node compat on, and `"customConditions": ["workerd"]` in its tsconfig, and the CLI loads it under Cloudflare's `workerd` conditions with `env` from `cloudflare:workers` filled from your local env files. A stray `cloudflare.config.ts` or `workerd` condition in a node bot stops the CLI with an error that points at it. ([#365](https://github.com/seedcord/seedcord/pull/365))
- Added `files` to `seedcord.config.ts`, like `files: ['./locales']` or `files: ['../assets']` beside `root`, for the folders a built bot reads through `readFiles`. `seedcord build` bundles non-code files from only those folders, binary files included, and `readFiles` throws `CoreDirectoryNotListed` for a folder `files` leaves out. A listed folder that is missing, is a file, or sits outside the folder that holds `seedcord.config.ts` throws `CliListedFolderUnusable`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Added `vitePlugins` to `seedcord.config.ts`. `seedcord dev`, `build`, `codegen` and `commands` run the Vite plugins it returns on your bot's code, like `vitePlugins: () => [yaml()]` with `@rollup/plugin-yaml` for a command that imports a `.yaml` file. A plugin that throws stops the CLI with `CoreVitePluginThrew`, and one that rewrites Vite's `seedcord` environment away throws `CliViteEnvironmentMissing` (#406). ([#402](https://github.com/seedcord/seedcord/pull/402))
- `seedcord codegen --check` now throws `CliCodegenOutOfDate` when `seedcord-gen.d.ts` is stale, naming the file and the command that rewrites it. ([#361](https://github.com/seedcord/seedcord/pull/361))
- Fixed `seedcord commands clean` exiting with code 0 when some of its deletes failed. It now warns about each one, then throws the new `CliCommandsNotDeleted`. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Added `seedcord commands deploy` to replace the commands in each scope your code targets, after it shows what each one gains and loses. It asks first, or needs `--yes` outside a terminal, and it skips a scope whose commands match the last deploy and whose names match Discord's unless you pass `--force`. An edge bot that gained a command needs `seedcord build` again to pick up its id. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Added `seedcord commands purge` to delete every command globally with `--global`, in the guilds you pass with `--guilds`, or in every guild the bot is in with `--all-guilds`. It lists what it would delete until you pass `--yes`. With no flags in a terminal, it opens a wizard. ([#396](https://github.com/seedcord/seedcord/pull/396))
- When `seedcord.config.ts` has two or more missing or invalid fields, the CLI now lists all of them in one `CliProblems` error, like a config with no `instance` and a `tunnel` of `'yes'`. `seedcord codegen` does the same for command files whose constructors throw, like `ban.ts` and `roll.ts` in one run. ([#361](https://github.com/seedcord/seedcord/pull/361))
- `@seedcord/core` now throws `CoreCommandGlobalDeployFailed` when Discord refuses the global commands, with Discord's error as its cause. ([#396](https://github.com/seedcord/seedcord/pull/396))
- `seedcord dev` now throws `CliDevAlreadyRunning` when another dev session runs a bot on the same Discord application, like two bot folders that read the same token. Two sessions on one application used to overwrite each other's commands and interactions endpoint. ([#411](https://github.com/seedcord/seedcord/pull/411))
- Error messages now show paths relative to the folder you run seedcord from, with forward slashes on Windows too. Run from `/home/you/bot`, a folder at `/home/you/bot/src/handlers` would show as `src/handlers`, for example. ([#361](https://github.com/seedcord/seedcord/pull/361))
- Added edge bots for Cloudflare Workers, made with `new Seedcord(config)` from `@seedcord/http` through the `workerd` export condition and able to take plugins like a node bot. An edge bot reads its public key, command ids and emoji ids from the worker `seedcord build` wrote, and throws `CoreEdgeUnbuilt` on its first POST when built some other way. Removed `createSeedcord`, the `Manifest` type, and the `@seedcord/http/edge` and `@seedcord/http/manifest` subpaths. ([#363](https://github.com/seedcord/seedcord/pull/363))
- The node `Seedcord` now has `fetch(request)` for mounting the bot on a route in your own server, like a Hono app. Set `port: false` to turn off the built-in server. `fetch` rejects with `CoreFetchBeforeStart` until `start()` is called, and answers 503 once shutdown begins or `start()` fails. ([#364](https://github.com/seedcord/seedcord/pull/364))
- A node http bot now fails to start with `PortInUse` when another process already listens on its `port`. On macOS, outside a `seedcord dev` quick tunnel, the bot starts anyway if that process listens on `127.0.0.1` only. ([#391](https://github.com/seedcord/seedcord/pull/391))
- `attach` now throws `CorePluginScopeMismatch` when a plugin's transport or runtime differs from the bot's, even when a cast or plain JS gets past the types. A plugin that narrows either one, like `Plugin<{ runtime: 'server' }>`, now has to pass the same value to `super()`, for example `super(host, { runtime: 'server' })`. ([#363](https://github.com/seedcord/seedcord/pull/363))

### 🩹 Patch

- Fixed a plugin attached during startup, like from a startup task, never running its `init()`. `attach` now throws `CorePluginAfterInit` once startup begins. ([#363](https://github.com/seedcord/seedcord/pull/363))
- A failed step in `create-seedcord` now prints the command that failed in bold and its output in color under its row, with stack frames left out. Pass `--verbose` to show them. ([#400](https://github.com/seedcord/seedcord/pull/400))
- Fixed a guild command deploy that Discord refused with a 401 telling you to check the guild id. The error now shows Discord's reason and tells you to check `DISCORD_BOT_TOKEN`. ([`ad9dd9b`](https://github.com/seedcord/seedcord/commit/ad9dd9b9001d1e9f567c1508b5add7cc10b6b7d2))
- Fixed the token check accepting a bot token whose first part holds no application id. A bot now throws `ConfigInvalidEnv` for it at startup, and `create-seedcord` asks for the token again. ([#411](https://github.com/seedcord/seedcord/pull/411))
- Fixed the token check rejecting tokens of apps made before October 2015, which have 17-digit application ids. ([#411](https://github.com/seedcord/seedcord/pull/411))

## 0.13.0

### 💥 Breaking

- `SeedcordErrorCode.UnsupportedNodeVersion` is now `UnsupportedRuntimeVersion`, still code 1008. On Bun, seedcord checks the Bun version against the minimum in `engines` and tells you to upgrade Bun. ([#357](https://github.com/seedcord/seedcord/pull/357))

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))
- Fixed a listed migration going missing when another listed file has the same name, like `users/001-init.ts` and `guilds/001-init.ts`. Startup now throws `PluginKyselyDuplicateMigrationName` with both file paths. ([#357](https://github.com/seedcord/seedcord/pull/357))

## 0.12.0

### ✨ Minor

- `ManifestEntryWrongClass` and `ManifestEntryNoRoutes` replace `InteractionRouteExportMissing`, `SubscriberRouteNotASubscriber`, and `RouteModuleLoadFailed`. Each names the manifest array and the class listed in it. ([#312](https://github.com/seedcord/seedcord/pull/312))

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

## 0.11.1

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

## 0.11.0

### ✨ Minor

- Added `CorePluginFromOtherCore` (1218), thrown when an attached plugin extends `Plugin` from a different copy of `@seedcord/core` than the bot. ([#336](https://github.com/seedcord/seedcord/pull/336))

## 0.10.0

### 💥 Breaking

- Renamed `SeedcordErrorCode.CliTsxImportFailed` to `CliTsImportFailed`. Its numeric value stays 3105. ([#327](https://github.com/seedcord/seedcord/pull/327))

## 0.9.0

### ✨ Minor

- Added `CoreCommandGuildsEmpty` (1213), thrown at startup when `@RegisterCommand('guild', [...])` passes `'config'` while `commands.guilds` is empty. ([#316](https://github.com/seedcord/seedcord/pull/316))
- Added `CoreCommandGuildDeployFailed` (1214). A guild command deploy Discord refuses now prints that guild id, with Discord's own error kept as the cause. ([#316](https://github.com/seedcord/seedcord/pull/316))
- Added `CorePluginGroupTaken` (1215) for nesting under a name the bot already uses, `CorePluginKeyHoldsGroup` (1216) for attaching a plugin where a group sits, and `CorePluginKeyMalformed` (1217) for a key with an empty part or a second dot. A repeated key still throws `CorePluginKeyExists`. ([#318](https://github.com/seedcord/seedcord/pull/318))

### 🩹 Patch

- `DecoratorCommandAlreadyRegistered` now prints both decorator calls written on the class. ([#316](https://github.com/seedcord/seedcord/pull/316))

## 0.8.0

### 💥 Breaking

- `SeedcordErrorCode.InteractionDuplicateMiddleware` is now `DuplicateMiddleware`, since event middleware throws it too. Dropping `DecoratorInteractionEventFilter` renumbered the five `Decorator*` codes after it. ([#310](https://github.com/seedcord/seedcord/pull/310))

    Added `DispatchStateMissing` for a `dispatch.require()` key that nothing wrote.

## 0.7.0

### 💥 Breaking

- renamed `SeedcordErrorCode.CustomIdValueOutOfRange` to `CustomIdValueRejected` (same error code). It now gives a more accurate description of the error with what's wrong and what was expected. ([#306](https://github.com/seedcord/seedcord/pull/306))
- A shutdown that used to run more than 25 seconds now stops there and skips the rest. This will most likely affect no one. ([#309](https://github.com/seedcord/seedcord/pull/309))

    Added `lifecycle.shutdownDeadline`, a cap on the whole shutdown, 25000ms by default. A shutdown that interrupts a slow startup waits for that startup out of the same budget. A deadline that is zero, negative, or not finite throws `LifecycleInvalidShutdownDeadline`.

## 0.6.0

### 💥 Breaking

- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

- `CustomIdHandlerRouteMissing` now tells you to add the decorator that matches your handler's base, with two examples. ([#303](https://github.com/seedcord/seedcord/pull/303))

## 0.5.1

### 🩹 Patch

- Two codes for a customId that fails to decode. `CustomIdWireStale` fires when the wire predates a shape change, and `CustomIdWireInvalid` when it is corrupt or came from a different definition. ([#299](https://github.com/seedcord/seedcord/pull/299))

## 0.5.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

### ✨ Minor

- A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Add two error codes. `CoreLifecycleUnavailable` throws when a bot adds a startup or shutdown task to a core built by `createSeedcord`, and `CoreBusEmitUnavailable` throws when a bot calls `core.bus.emit`. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind. ([#294](https://github.com/seedcord/seedcord/pull/294))

### 🩹 Patch

- `seedcord codegen` now throws and names the file when a class carrying `@RegisterCommand` fails to construct. ([#296](https://github.com/seedcord/seedcord/pull/296))

## 0.4.3

### 💥 Breaking

- Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`. ([#288](https://github.com/seedcord/seedcord/pull/288))

## 0.4.2

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

## 0.4.1

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

## 0.4.0

### 💥 Breaking

- sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`. ([`aa6bb3a`](https://github.com/seedcord/seedcord/commit/aa6bb3a))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these. ([`e11cbb3`](https://github.com/seedcord/seedcord/commit/e11cbb3))

### ✨ Minor

- `paint` now carries `bold`, `italic` and `underline` beside its color tones. `paint.mute` for dim. ([#251](https://github.com/seedcord/seedcord/pull/251))

### 🩹 Patch

- `isSeedcordError` now narrows correctly when two copies of `@seedcord/errors` are installed. ([#249](https://github.com/seedcord/seedcord/pull/249))
- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

## 0.3.4

### 💥 Breaking

- `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`. ([`8e8e952`](https://github.com/seedcord/seedcord/commit/8e8e952))

### 🩹 Patch

- Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%. ([`527a465`](https://github.com/seedcord/seedcord/commit/527a465))

## 0.3.3

### 🩹 Patch

- Moved `paint` to the errors package ([#238](https://github.com/seedcord/seedcord/pull/238))
- New error codes for the create command ([#238](https://github.com/seedcord/seedcord/pull/238))

## 0.3.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

## 0.3.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place. ([#230](https://github.com/seedcord/seedcord/pull/230))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

## 0.3.0

### 💥 Breaking

- the error-code set was reworked. Codes were added, removed, and renumbered across every group, so re-check any code you match on by name or by number. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    Notable removals, the four per-reporter webhook codes collapse into `ConfigWebhookUrlInvalid` and `ConfigWebhookNotFound`. `PluginMongo*` is now `PluginMongoose*` and `PluginKpg*` is now `PluginKysely*`.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

## 0.2.2-next.0

### 🩹 Patch

- Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one. ([#163](https://github.com/seedcord/seedcord/pull/163))
- A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`. ([#163](https://github.com/seedcord/seedcord/pull/163))

## 0.2.1

### 🩹 Patch

- Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use. ([#149](https://github.com/seedcord/seedcord/pull/149))
- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

## 0.2.0

### ✨ Minor

- remove `BaseSeedcordError` from public exports ([#147](https://github.com/seedcord/seedcord/pull/147))

### 🩹 Patch

- Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands. ([#147](https://github.com/seedcord/seedcord/pull/147))
- `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable. ([#147](https://github.com/seedcord/seedcord/pull/147))

## 0.1.0

### ✨ Minor

- Add two published leaf packages. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.
