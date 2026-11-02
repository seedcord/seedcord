# @seedcord/core

## 0.12.0-next.1

### 💥 Breaking

- Plugin `init()`, `ready()`, `dispose()` and `onHmr()`, handler `execute()`, and middleware `after()` can now return without a promise. Code that calls one of them directly and chains `.then()` must `await` it or wrap it in `Promise.resolve()`. ([#424](https://github.com/seedcord/seedcord/pull/424), thanks [@lunaradev1](https://github.com/lunaradev1))
- `RequirePermissions` has a new `unresolved` option for the refusal it throws when a member's permissions don't resolve inside a server. That refusal used to come from `notInGuild`. ([#432](https://github.com/seedcord/seedcord/pull/432))
- The override options on every gate and permission helper now take a `Notice` class for seedcord to construct with that refusal's data, like the missing permission names or a cooldown's `resetAt`. Write a small class where you passed `{ message }`, a `Notice` instance, or Cooldown's functions. `missingNotice` and `dangerousNotice` became one `notice` that also covers `inverse`. ([#432](https://github.com/seedcord/seedcord/pull/432))
- A permission check on a bot whose own member isn't cached now throws `CoreBotMemberMissing`, where it used to refuse as if every permission were missing. `RequireBotPermissions` without `in: 'guild'` no longer compiles on an event handler, where it used to refuse every event. ([#432](https://github.com/seedcord/seedcord/pull/432))

### 🩹 Patch

- Reworded error messages and log lines that joined their parts with the wrong word or read two ways. The gate mismatch compile error now reads like `needs a handler of kind Slash, but this handler's kind is Button`. ([`6f71a86`](https://github.com/seedcord/seedcord/commit/6f71a868e39df8cff3b857688544404113d46596))
- Fixed the compile error for a gate attached to a handler it doesn't fit. A gate typed with `InteractionGateContext` now prints one message, where it printed one per interaction kind and one of them read "requires a an interaction handler". ([#432](https://github.com/seedcord/seedcord/pull/432))
- Fixed the compile error for a route decorator that doesn't match its handler's generic. It now shows both values, like `{ decorator: "roster"; generic: "ping" }`, and a misspelled command gives one error that quotes it. ([`87e61bb`](https://github.com/seedcord/seedcord/commit/87e61bb7bc30ad07ccfbfb66d4b02103761f4b87))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.15.0-next.0 → 0.15.0-next.1
- `@seedcord/custom-id` 0.3.1-next.0 → 0.3.1-next.1
- `@seedcord/logger` 0.6.0-next.0 → 0.6.0-next.1
- `@seedcord/types` 0.16.0-next.0 → 0.16.0-next.1

## 0.12.0-next.0

### 💥 Breaking

- Renamed context-menu handlers' `commandName` to `route` and removed handlers' `routeId`. Read the dispatch identifier from `this.dispatch.routeId`. ([#422](https://github.com/seedcord/seedcord/pull/422))
- `config.store` is now `config.kv`, and your handlers and plugins read it through `core.kv` and `this.kv`. Leave it out to keep everything in memory, or pass a `KeyvDriver`, an `UnstorageDriver`, or your own driver. Import `buildKey` from your transport package, and rename any plugin attached as `kv`. ([#429](https://github.com/seedcord/seedcord/pull/429))

### ✨ Minor

- Plugins can now define `codegen()`, and `seedcord codegen` writes what it returns into `seedcord-gen.ts`. A plugin reads that back with `Generated<typeof ThePlugin>`, keyed by its `static readonly id`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- `reply()`, `update()`, and the other reply methods now take raw component json next to builders, like `{ type: 10, content: 'hi' }` or the components `@dressed/react` renders. ([`ba8d7d0`](https://github.com/seedcord/seedcord/commit/ba8d7d0dbc0822861f3152f30df66b8f541450cc))

### 🩹 Patch

- Fixed a `once` subscriber running again in `seedcord dev` when a broken save rolled its file back. ([#430](https://github.com/seedcord/seedcord/pull/430))
- Fixed a plugin's constructor logging on the `default` channel. Those lines now use its attach key as their channel, like every other log line from the plugin. ([#429](https://github.com/seedcord/seedcord/pull/429))
- Hovering a `CustomId`, its decoded `this.params` or a `match` arm, or an autocomplete's `this.focused` now shows the plain fields, like `{ userId: string; amount: number }`. ([`b3b4489`](https://github.com/seedcord/seedcord/commit/b3b44898c3738ffaa3546319703f545c4feb3f46))
- Fixed a `null` or `undefined` entry in a reply's `components` crashing with a bare `TypeError`. It now throws seedcord's serialization error with the entry's index, like any other bad component. ([`ba8d7d0`](https://github.com/seedcord/seedcord/commit/ba8d7d0dbc0822861f3152f30df66b8f541450cc))
- Fixed routine request and dispatch details appearing at `debug` instead of `trace`. ([#423](https://github.com/seedcord/seedcord/pull/423))
- Fixed the `type-fest` types in the published declarations failing to resolve, since each package listed `type-fest` only as a dev dependency. ([`50db882`](https://github.com/seedcord/seedcord/commit/50db8827aca008f874bf60e5796a696c894056cc))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.5.0 → 0.6.0-next.0
- `@seedcord/utils` 0.9.0 → 0.9.1-next.0
- `@seedcord/types` 0.15.0 → 0.16.0-next.0
- `@seedcord/errors` 0.14.0 → 0.15.0-next.0
- `@seedcord/custom-id` 0.3.0 → 0.3.1-next.0

## 0.11.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- A relative folder path in the bot config, a plugin's `dir`, Kysely's migrations folder, and a folder passed to `importFiles` now resolve against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before. ([#382](https://github.com/seedcord/seedcord/pull/382))
- seedcord now needs envapt ≥9.2. Run `pnpm add envapt@latest`, then update your own envapt reads with the [v8 to v9 migration guide](https://envapt.materwelon.dev/docs/migration-v8-to-v9/). ([`99e7d64`](https://github.com/seedcord/seedcord/commit/99e7d6400b19af6db55548fd02c41ac1eb9b1737))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `importFiles` now skips dotfiles, dot-folders, `node_modules`, `outDir` and the logs folder, the same way a built bot does. That covers handler, command and service folders, the command scan in `seedcord codegen` and `commands`, and hot reload in `seedcord dev`. Move a handler out of a folder like `.drafts/` to keep it loading. ([#359](https://github.com/seedcord/seedcord/pull/359))

### ✨ Minor

- `seedcord dev` now skips deploying the global commands, or one guild's commands, when they haven't changed since the last deploy and Discord has commands with the same names. It reads their ids from Discord, and stores the last deploy in `.seedcord/deployed-commands.json`. ([#398](https://github.com/seedcord/seedcord/pull/398))
- `Pluggable` in `@seedcord/core/node` is now `ServerHost`, and `@seedcord/core/plugin` now exports `PluginHost`, the base class that defines `attach`. ([#362](https://github.com/seedcord/seedcord/pull/362))
- `attach` now throws `CorePluginScopeMismatch` when a plugin's transport or runtime differs from the bot's, even when a cast or plain JS gets past the types. A plugin that narrows either one, like `Plugin<{ runtime: 'server' }>`, now has to pass the same value to `super()`, for example `super(host, { runtime: 'server' })`. ([#363](https://github.com/seedcord/seedcord/pull/363))
- The gateway and node http `Seedcord` now work with `await using`. When the block ends, the bot runs its shutdown without calling `process.exit`. ([#364](https://github.com/seedcord/seedcord/pull/364))
- A `startup.addTask` task now gets an `AbortSignal` that aborts when the task times out or startup stops. ([#389](https://github.com/seedcord/seedcord/pull/389))

### 🩹 Patch

- Fixed a plugin attached during startup, like from a startup task, never running its `init()`. `attach` now throws `CorePluginAfterInit` once startup begins. ([#363](https://github.com/seedcord/seedcord/pull/363))
- Fixed `attach` rejecting a free key like `token` as already taken, as in `seedcord.attach('token', MyPlugin)` on an http bot. ([#362](https://github.com/seedcord/seedcord/pull/362))
- Fixed the extra spacing before permission bullets in the permissions notice. Permission details now appear directly below the lead text. ([#370](https://github.com/seedcord/seedcord/pull/370), thanks [@lunaradev1](https://github.com/lunaradev1))
- Fixed `seedcord dev` asking to refresh commands when you save a file in a folder like `commands-extra` next to your commands folder. ([#382](https://github.com/seedcord/seedcord/pull/382))
- `@seedcord/core` now throws `CoreCommandGlobalDeployFailed` when Discord refuses the global commands, with Discord's error as its cause. ([#396](https://github.com/seedcord/seedcord/pull/396))
- Fixed a bot bundled by Next.js throwing a duplicate middleware error at startup, because the minifier gave two middleware classes the same name. Two middleware classes that share a name now both run. ([#407](https://github.com/seedcord/seedcord/pull/407))
- The "Failed to reload file" line in `seedcord dev` now prints the path relative to your project, like `./src/handlers/Ping.ts`. ([#402](https://github.com/seedcord/seedcord/pull/402))
- Fixed a guild command deploy that Discord refused with a 401 telling you to check the guild id. The error now shows Discord's reason and tells you to check `DISCORD_BOT_TOKEN`. ([`ad9dd9b`](https://github.com/seedcord/seedcord/commit/ad9dd9b9001d1e9f567c1508b5add7cc10b6b7d2))
- Fixed a bot failing to start when Discord held its command deploy longer than 10 seconds, like on a third restart within a minute. Startup now gives the deploy up to 75 seconds for Discord's rate limit to reset, and logs how long Discord makes it wait. ([#389](https://github.com/seedcord/seedcord/pull/389))
- Under `seedcord dev`, the command deploy log now shows each guild by its name. ([#398](https://github.com/seedcord/seedcord/pull/398))
- Fixed a bot under `seedcord dev` exiting on its own at `SIGTERM` before the CLI cleared its interactions endpoint. ([`6b6f9d7`](https://github.com/seedcord/seedcord/commit/6b6f9d789da1f62c6afdcfc580cd5c5c954f431d))
- An unknown fault now prints its whole stack in your terminal, since `errors.errorStack` defaults to `true`. Set `errorStack: false` for the one-line log. ([`2443eb9`](https://github.com/seedcord/seedcord/commit/2443eb9813945fcd8fd387411df7330676a2330e))
- Handler, middleware, command, subscriber, and service folders now load their files sorted by path. ([#358](https://github.com/seedcord/seedcord/pull/358))
- Fixed a gateway bot answering its health path before every plugin's `ready()` finished. The health server now opens once startup is done. ([#416](https://github.com/seedcord/seedcord/pull/416))
- Adding or removing a startup or shutdown task no longer writes a debug log line. ([#359](https://github.com/seedcord/seedcord/pull/359))
- Fixed `seedcord codegen`, `seedcord build`, and `seedcord commands` each writing a log file under `logs/` in development. A bot now applies its `logger` config, along with the default log file, when `start()` runs. ([`b3d661a`](https://github.com/seedcord/seedcord/commit/b3d661a9ff02ab15c3b40aaea5dd786c79d9bc9c))
- Fixed the health check rejecting with node's raw `EADDRINUSE` when its port is taken. It now throws `PortInUse`. ([#414](https://github.com/seedcord/seedcord/pull/414), thanks [@TheDanikReal](https://github.com/TheDanikReal))
- `Seedcord` now listens for SIGINT and SIGTERM once `start()` runs. Building a bot without starting it, like a test or `seedcord codegen` does, leaves the process's Ctrl+C handling unchanged. ([#359](https://github.com/seedcord/seedcord/pull/359))
- Fixed a bot that failed to start still deploying its commands later, once Discord's rate limit cleared. ([#389](https://github.com/seedcord/seedcord/pull/389))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.3.0-next.0 → 0.3.0
- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/event-emitter` 0.1.9-next.0 → 0.2.0
- `@seedcord/logger` 0.5.0-next.1 → 0.5.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0
- `@seedcord/utils` 0.9.0-next.1 → 0.9.0

## 0.10.0

### 💥 Breaking

- `SeedcordErrorCode.UnsupportedNodeVersion` is now `UnsupportedRuntimeVersion`, still code 1008. On Bun, seedcord checks the Bun version against the minimum in `engines` and tells you to upgrade Bun. ([#357](https://github.com/seedcord/seedcord/pull/357))

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.2.6 → 0.2.7
- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/event-emitter` 0.1.7 → 0.1.8
- `@seedcord/logger` 0.4.3 → 0.4.4
- `@seedcord/types` 0.14.3 → 0.14.4
- `@seedcord/utils` 0.8.16 → 0.8.17

## 0.9.4

### 🩹 Patch

- Fixed `seedcord.config.botColor` having no effect when you assign it after `new Seedcord()`. If you load the color after startup, like from a settings file, every embed and container you send after that will use it. ([`9dc8b19`](https://github.com/seedcord/seedcord/commit/9dc8b191723a547ac29c3bcc356f22a8e35cea98))

#### 📦 Seedcord packages

- `@seedcord/types` 0.14.2 → 0.14.3

## 0.9.3

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))
- A `WebhookLog` whose env var is unset now warns once at registration on every transport. `execute()` throws `ConfigMissingEnv` when the variable disappears after that. ([#312](https://github.com/seedcord/seedcord/pull/312))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/custom-id` 0.2.5 → 0.2.6
- `@seedcord/event-emitter` 0.1.6 → 0.1.7
- `@seedcord/logger` 0.4.2 → 0.4.3
- `@seedcord/types` 0.14.1 → 0.14.2
- `@seedcord/utils` 0.8.15 → 0.8.16

## 0.9.2

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.2.4 → 0.2.5
- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/event-emitter` 0.1.5 → 0.1.6
- `@seedcord/logger` 0.4.1 → 0.4.2
- `@seedcord/types` 0.14.0 → 0.14.1
- `@seedcord/utils` 0.8.14 → 0.8.15

## 0.9.1

### 🩹 Patch

- Fixed `attach()` failing to compile with `'[]' is not assignable to parameter of type 'never'` for a plugin class with a type parameter, like `class Cache<T> extends Plugin`. That plugin now attaches as `Cache<unknown>`. ([`8f8ef13`](https://github.com/seedcord/seedcord/commit/8f8ef131717c83b7b4c8d63933c96d7f6d9d371e))
- Fixed the unclear `Cannot read properties of undefined (reading 'setChannel')` error when attaching a plugin built on a different copy of `@seedcord/core`. It now throws `CorePluginFromOtherCore` before the plugin is constructed. ([#336](https://github.com/seedcord/seedcord/pull/336))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0
- `@seedcord/utils` 0.8.13 → 0.8.14
- `@seedcord/logger` 0.4.0 → 0.4.1
- `@seedcord/custom-id` 0.2.3 → 0.2.4

## 0.9.0

### 💥 Breaking

- seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property. ([#327](https://github.com/seedcord/seedcord/pull/327))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.3.3 → 0.4.0
- `@seedcord/errors` 0.9.0 → 0.10.0
- `@seedcord/custom-id` 0.2.2 → 0.2.3
- `@seedcord/utils` 0.8.12 → 0.8.13

## 0.8.0

### ✨ Minor

- A plugin key takes one dot, so `attach('services.users', Users)` reads back as `core.services.users`. The compiler rejects a key that collides with a plugin, a group, or a member the bot already carries. ([#318](https://github.com/seedcord/seedcord/pull/318))
- `@RegisterCommand()` with no arguments deploys a command to the guilds in `commands.guilds`. With no ids there, it deploys globally. `@RegisterCommand('guild', ['config', '123'])` deploys to those same guilds plus `123`. ([#316](https://github.com/seedcord/seedcord/pull/316))

### 🩹 Patch

- `DecoratorCommandAlreadyRegistered` now prints both decorator calls written on the class. ([#316](https://github.com/seedcord/seedcord/pull/316))
- Added `CoreCommandGuildDeployFailed` (1214). A guild command deploy Discord refuses now prints that guild id, with Discord's own error kept as the cause. ([#316](https://github.com/seedcord/seedcord/pull/316))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/types` 0.13.0 → 0.14.0
- `@seedcord/utils` 0.8.11 → 0.8.12
- `@seedcord/custom-id` 0.2.1 → 0.2.2
- `@seedcord/logger` 0.3.2 → 0.3.3

## 0.7.0

### 💥 Breaking

- Renamed `routeId` on `unknownException` and `handledException` to `origin`, because on an event it carries a third segment naming the handler that threw. A subscriber reading `this.data.routeId` now reads `this.data.origin`. `interactionDispatched` and `responseAttempted` keep theirs. ([#311](https://github.com/seedcord/seedcord/pull/311))
- Renamed `routeId` on the gate context to `declaredRoute`, because the bag beside it carries a field of the same name, and only the gate context's is null off a route. A gate reading `ctx.routeId` now reads `ctx.declaredRoute`. The bag is unchanged. ([#311](https://github.com/seedcord/seedcord/pull/311))
- every handler constructor now takes a `DispatchContext`. ([#310](https://github.com/seedcord/seedcord/pull/310))

    `@RegisterInteractionMiddleware` registers an interaction middleware and filters it with `{ kinds }`. Middleware, gates, and error cards read one typed bag per dispatch through `this.dispatch`.

### ✨ Minor

- Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults. ([#311](https://github.com/seedcord/seedcord/pull/311))
- `interactionDispatched` now carries `userId` and `guildId`. ([#310](https://github.com/seedcord/seedcord/pull/310))
- Added `eventDispatched`, which fires once an event's handlers settle and carries the class name and outcome of each one. An event used to report only that it started, so a handler that failed showed up nowhere. A fire that runs no handler stays quiet, matching `eventDispatching`. ([#311](https://github.com/seedcord/seedcord/pull/311))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/utils` 0.8.10 → 0.8.11
- `@seedcord/custom-id` 0.2.0 → 0.2.1

## 0.6.0

### 💥 Breaking

- A shutdown that used to run more than 25 seconds now stops there and skips the rest. This will most likely affect no one. ([#309](https://github.com/seedcord/seedcord/pull/309))

    Added `lifecycle.shutdownDeadline`, a cap on the whole shutdown, 25000ms by default. A shutdown that interrupts a slow startup waits for that startup out of the same budget. A deadline that is zero, negative, or not finite throws `LifecycleInvalidShutdownDeadline`.

### 🩹 Patch

- Fixed a plugin whose `init()` outlasts its timeout. Its `dispose()` now runs when that `init()` resolves, for as long as the process is still alive, so it can release whatever `init()` claimed past the deadline. A late `init()` that rejects now logs a warning. ([#309](https://github.com/seedcord/seedcord/pull/309))
- The transport packages now export `prefixOf`, `decodeFor`, and the custom-id types. Reading a raw customId no longer needs `@seedcord/custom-id` as a direct dependency. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))
- Fixed the wait that bounds a shutdown step. The shutdown now continues past a failing step. ([#308](https://github.com/seedcord/seedcord/pull/308))

    Fixed a lifecycle task or plugin hook that throws before returning a promise. The throw now rejects the returned promise.

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.1 → 0.2.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10

## 0.5.0

### 💥 Breaking

- Select menus get one decorator and one base per kind, so `@UserMenuRoute` pairs with `UserMenuHandler` as an example. `@SelectMenuRoute` and `SelectMenuKind` are removed, and `SelectMenuHandler` stays as the shared base your kind's base extends. Each base declares only the members its own menu resolves. Check the updated guide page for select menus. ([#303](https://github.com/seedcord/seedcord/pull/303))
- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### ✨ Minor

- `InteractionKind` now ships from the package root. Use its members to compare against the `kind` you read off `interactionDispatched`. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

- Fixed handler metadata reads across two copies of core. ([#301](https://github.com/seedcord/seedcord/pull/301))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/custom-id` 0.1.0 → 0.1.1
- `@seedcord/utils` 0.8.8 → 0.8.9

## 0.4.1

### 🩹 Patch

- `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.0 (new)
- `@seedcord/types` 0.10.0 → 0.10.1
- `@seedcord/errors` 0.5.0 → 0.5.1

## 0.4.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound. ([#295](https://github.com/seedcord/seedcord/pull/295))

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

- The `responseAttempted` payload is now a union of `ResponseSent` and `ResponseFailed`, both exported. Check `outcome` to reach `error`. Every framework payload field is readonly now, because the bus hands one object to every subscriber. ([`0c6cdc8`](https://github.com/seedcord/seedcord/commit/0c6cdc8))

### ✨ Minor

- `errors.catchProcessErrors` reports a throw that escaped every handler, and defaults on. The bot keeps running after a rejection. An uncaught exception runs the coordinated shutdown and exits 1. ([#293](https://github.com/seedcord/seedcord/pull/293))
- Every `CustomId` field now also takes `{ nullable: true }` and decodes to `T | null`, at one extra slot on the wire. Marking a live field nullable will change its layout hash as well. ([#295](https://github.com/seedcord/seedcord/pull/295))
- Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now. ([`3ff40e7`](https://github.com/seedcord/seedcord/commit/3ff40e7))

### 🩹 Patch

- Fixed `Seedcord.attach()` not showing up in the documentation. ([`2cb3c87`](https://github.com/seedcord/seedcord/commit/2cb3c87))
- `seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Every gate seedcord ships now sets `summary`. An `or` whose arms all refuse lists what each one required, under the lead line `You need to meet any of these:`. ([`5f4e203`](https://github.com/seedcord/seedcord/commit/5f4e203))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
- `and` and `or` now bracket an arm that is itself a combinator. `or(and(A, B), C)` names itself `(A & B) | C` on a `@Gated` hover and in the compile error for a gate that does not fit its handler. ([`6872865`](https://github.com/seedcord/seedcord/commit/6872865))
- Fix the `Silence` example. It threw from an interaction while the text above it said to throw only in event handlers. ([#296](https://github.com/seedcord/seedcord/pull/296))
- A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host. ([#293](https://github.com/seedcord/seedcord/pull/293))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/event-emitter` 0.1.4 → 0.1.5
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8

## 0.3.1

### 💥 Breaking

- Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`. ([#288](https://github.com/seedcord/seedcord/pull/288))
- `Plugin`, `PluginLifecycleSpec`, and `PluginOptions` are better documented now with examples and explanations. ([`aa4d4c0`](https://github.com/seedcord/seedcord/commit/aa4d4c0))

    **BREAKING:** `Initializeable` moved to `@seedcord/core/internal`. It describes framework wiring, and `Plugin` already declares `abstract init()` for you. This was supposed to be internal anyway. No one should have been implementing it.

### 🩹 Patch

- A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports. ([#289](https://github.com/seedcord/seedcord/pull/289))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.3.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.2.1

### 🩹 Patch

- The gate mismatch compile error now reads `gate 'Name' requires a X handler, and this handler is Y`. The `@see` lines on the gate factories now point at your transport package for `@Gated`. ([#273](https://github.com/seedcord/seedcord/pull/273))
- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.2.0

### 💥 Breaking

- `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`. ([`5c7c3e2`](https://github.com/seedcord/seedcord/commit/5c7c3e2))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- A WebhookLog report can also set avatarUrl for the webhook now. ([#244](https://github.com/seedcord/seedcord/pull/244))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- A failed lifecycle phase or plugin dispose now throws an error carrying each underlying failure. ([#249](https://github.com/seedcord/seedcord/pull/249))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers. ([#244](https://github.com/seedcord/seedcord/pull/244))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/event-emitter` 0.1.2 → 0.1.3
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.1.4

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.1.3

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.1.1

### 💥 Breaking

- `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check. ([#230](https://github.com/seedcord/seedcord/pull/230))

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Both transports now trace the elapsed time of each dispatched interaction and each reply write. ([#234](https://github.com/seedcord/seedcord/pull/234))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Per-phase lines are now debug and per-task lines are trace. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/event-emitter` 0.1.0 → 0.1.1

## 0.1.0

### 💥 Breaking

- `Commands` and `ContextMenus` join `Emojis` as module-level accessors filled during startup. `Commands` is keyed by slash route and `ContextMenus` splits into `user` and `message`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import the accessors directly. Reading a key before startup resolves it will throw.

- the component builders are built on `@discordjs/builders`. Import any builder you nest inside a seedcord component from there too, because the copy discord.js re-exports is a separate class that breaks `instanceof`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `ControlCosmetics.emoji` takes an `APIMessageComponentEmoji` such as `{ name: '👍' }`. A bare string no longer type-checks.

- `core.bot` no longer emits events. The four keys moved to `core.bus` as `unhandledInteractionError`, `unhandledEventError`, `anyEvent`, and `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `interactionDispatched` and `responseAttempted` are new, and both carry `interactionId` so a subscriber can join them to calculate durations such as network time. `publish` rejects the framework's own keys.

    **BREAKING:** `AllSubscriptions` is no longer exported. Type a payload with `SubscriptionData<K>` if needed.

- `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` for the previous base-set behavior. They fit modal and event handlers now. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `GateContextBase` is scalar (`userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`, `appPermissions`, `routeId`). A gate that read `ctx.user`, `ctx.guild`, or `ctx.member` reads the id scalars or annotates a gateway arm.

    `Cooldown` keys its window by route, so a durable store keeps it across restarts.

- the lifecycle phases are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** the coordinators no longer emit events, and nothing replaces them. A task registered with `addTask` runs where the matching event fired. Gateway drains in-flight dispatch before the client disconnects.

    **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `username`, `augmentTarget`, and `start()` are gone from handlers. Read them off the instance you constructed.

- Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/core`, the transport-agnostic framework surface both `@seedcord/gateway` and `@seedcord/http` build on and re-export. The transport packages re-exporting most things from it though. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/event-emitter` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0
