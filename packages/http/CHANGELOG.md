# @seedcord/http

## 0.12.0-next.3

### 💥 Breaking

- `Paginator` now sends an ephemeral first page by default, where it used to post a public message that anyone could click through. Pass `ephemeral: false` to keep a public list. ([#440](https://github.com/seedcord/seedcord/pull/440))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.12.0-next.2 → 0.12.0-next.3
- `@seedcord/errors` 0.15.0-next.2 → 0.15.0-next.3

## 0.12.0-next.2

### 💥 Breaking

- Fixed `Cannot properly serialize component type: undefined` when your bot and seedcord resolved different versions of `@discordjs/builders`. It's now a peer dependency, so seedcord uses your bot's copy. On Yarn, add it to your bot's dependencies. ([#438](https://github.com/seedcord/seedcord/pull/438))
- Fixed `StaleCustomId` on every click of the second component when a handler lists two customIds with the same prefix. Every route decorator now throws `DecoratorDuplicateKey` for a repeated route or prefix when the file loads. ([#437](https://github.com/seedcord/seedcord/pull/437))
- Read an event middleware's event name from `this.route` now, in place of `this.eventName`. Event handlers and interaction middleware now have `this.route` too, the same as interaction handlers. ([#437](https://github.com/seedcord/seedcord/pull/437))
- Read a gate's route from `ctx.dispatch.declaredRoute` now, since `ctx.declaredRoute` no longer exists. ([#437](https://github.com/seedcord/seedcord/pull/437))
- `HmrModuleHandler` now takes `handlers: { dir, is, register, unregister, getArtifacts }` and `middlewares: { dir, is, register, unregister }` instead of flat options like `handlersDir` and `isHandler`. Upgrade your plugins if you use this. Also bump official plugin versions that you're using. ([#438](https://github.com/seedcord/seedcord/pull/438))
- `@Subscribe` now takes one `[key, options?]` tuple per key, the same shape as `@RegisterEvent`. Change `@Subscribe('levelUp', { frequency: 'once' })` to `@Subscribe(['levelUp', { frequency: 'once' }])`. One subscriber can now list several keys, branch on the published one with `this.match`, and read it from `this.key`. ([#437](https://github.com/seedcord/seedcord/pull/437))

### ✨ Minor

- Added the `REST` type to both transports and the `API` type to `@seedcord/http`, for helpers that take `core.rest` or `this.api`. ([#438](https://github.com/seedcord/seedcord/pull/438))
- `this.match()` now resolves to the union of what its cases return, so cases can return different types. A named case map with an extra key no longer compiles, unless you pass `Ret`. With `this.match<Ret>()`, each case must still return `Ret`. ([#438](https://github.com/seedcord/seedcord/pull/438))
- Interaction handlers and middleware now have `this.user`, the user who sent the interaction. On http it reads `member.user` in a guild, where `this.event.user` is undefined. ([#437](https://github.com/seedcord/seedcord/pull/437))

### 🩹 Patch

- Fixed an autocomplete handler that throws a `Silence` or an ignored API code leaving Discord without a response. seedcord now sends empty choices on a fault if the handler hasn't responded yet. ([#437](https://github.com/seedcord/seedcord/pull/437))
- Fixed http not logging a warning when an interaction reaches the unhandled default or carries a custom ID that seedcord can't route. It now warns the same as gateway. ([#437](https://github.com/seedcord/seedcord/pull/437))
- Both transports now log handler faults on the `errors` channel as `Faults`. http used to log them on `interactions` as `Dispatcher`, and gateway labelled some of them `ErrorsHandling`. ([#437](https://github.com/seedcord/seedcord/pull/437))
- Fixed a `Notice` whose `render()` throws leaving the user with no reply. The user now gets the default fault card on both transports. ([#437](https://github.com/seedcord/seedcord/pull/437))

#### 📦 Seedcord packages

- `@seedcord/core` 0.12.0-next.1 → 0.12.0-next.2
- `@seedcord/errors` 0.15.0-next.1 → 0.15.0-next.2
- `@seedcord/utils` 0.9.1-next.0 → 0.9.1-next.1

## 0.12.0-next.1

### 💥 Breaking

- Plugin `init()`, `ready()`, `dispose()` and `onHmr()`, handler `execute()`, and middleware `after()` can now return without a promise. Code that calls one of them directly and chains `.then()` must `await` it or wrap it in `Promise.resolve()`. ([#424](https://github.com/seedcord/seedcord/pull/424), thanks [@lunaradev1](https://github.com/lunaradev1))

### 🩹 Patch

- Reworded error messages and log lines that joined their parts with the wrong word or read two ways. The gate mismatch compile error now reads like `needs a handler of kind Slash, but this handler's kind is Button`. ([`6f71a86`](https://github.com/seedcord/seedcord/commit/6f71a868e39df8cff3b857688544404113d46596))
- Fixed the compile error for a gate attached to a handler it doesn't fit. A gate typed with `InteractionGateContext` now prints one message, where it printed one per interaction kind and one of them read "requires a an interaction handler". ([#432](https://github.com/seedcord/seedcord/pull/432))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.15.0-next.0 → 0.15.0-next.1
- `@seedcord/custom-id` 0.3.1-next.0 → 0.3.1-next.1
- `@seedcord/core` 0.12.0-next.0 → 0.12.0-next.1
- `@seedcord/logger` 0.6.0-next.0 → 0.6.0-next.1
- `@seedcord/types` 0.16.0-next.0 → 0.16.0-next.1

## 0.12.0-next.0

### 💥 Breaking

- Renamed context-menu handlers' `commandName` to `route` and removed handlers' `routeId`. Read the dispatch identifier from `this.dispatch.routeId`. ([#422](https://github.com/seedcord/seedcord/pull/422))
- `config.store` is now `config.kv`, and your handlers and plugins read it through `core.kv` and `this.kv`. Leave it out to keep everything in memory, or pass a `KeyvDriver`, an `UnstorageDriver`, or your own driver. Import `buildKey` from your transport package, and rename any plugin attached as `kv`. ([#429](https://github.com/seedcord/seedcord/pull/429))

### ✨ Minor

- Added a readonly `route` property to slash, context-menu, and component handlers for the selected command's path, command name, or custom-ID prefix. ([#422](https://github.com/seedcord/seedcord/pull/422))
- Plugins can now define `codegen()`, and `seedcord codegen` writes what it returns into `seedcord-gen.ts`. A plugin reads that back with `Generated<typeof ThePlugin>`, keyed by its `static readonly id`. ([#426](https://github.com/seedcord/seedcord/pull/426))

### 🩹 Patch

- `seedcord dev` now warns when an http bot with `port: false` runs with a quick tunnel, and links the guide's fix. ([`2c04581`](https://github.com/seedcord/seedcord/commit/2c0458198ec443fc3b23be2b6d2985cce57245f7))
- Fixed interactions through `fetch()` failing while a `ready()` call took longer than Discord's three seconds, because `fetch()` held every request until all of them finished. It now answers once the Ready phase starts, the same moment the built-in server does. ([`f2cb9a9`](https://github.com/seedcord/seedcord/commit/f2cb9a9e1897fda0c49445a65fdb35fa8f707a8a))
- Fixed routine request and dispatch details appearing at `debug` instead of `trace`. ([#423](https://github.com/seedcord/seedcord/pull/423))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.5.0 → 0.6.0-next.0
- `@seedcord/utils` 0.9.0 → 0.9.1-next.0
- `@seedcord/core` 0.11.0 → 0.12.0-next.0
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

### ✨ Minor

- A built bot now reads its `.env` files from the folder that holds `seedcord.config.ts`, whichever folder you start it from. A bun binary, or a build copied away from its `seedcord.config.ts`, reads them from the folder you start it in. `bot.ts` no longer needs `Envapter.baseDir = resolve(import.meta.dirname, '..')`, though a `baseDir` you set there still wins. ([#403](https://github.com/seedcord/seedcord/pull/403))
- Removed the `runtime` field from the bot config. Delete it from your config, and write `Seedcord` where you wrote `Seedcord<HttpServerConfig>`. ([#363](https://github.com/seedcord/seedcord/pull/363))
- Added edge bots for Cloudflare Workers, made with `new Seedcord(config)` from `@seedcord/http` through the `workerd` export condition and able to take plugins like a node bot. An edge bot reads its public key, command ids and emoji ids from the worker `seedcord build` wrote, and throws `CoreEdgeUnbuilt` on its first POST when built some other way. Removed `createSeedcord`, the `Manifest` type, and the `@seedcord/http/edge` and `@seedcord/http/manifest` subpaths. ([#363](https://github.com/seedcord/seedcord/pull/363))
- Added a health path to a node http bot. Its interactions server answers `/health` with a 503 until startup finishes and a 200 after it, and `healthCheck: false` turns it off. ([#416](https://github.com/seedcord/seedcord/pull/416))
- The node `Seedcord` now has `fetch(request)` for mounting the bot on a route in your own server, like a Hono app. Set `port: false` to turn off the built-in server. `fetch` rejects with `CoreFetchBeforeStart` until `start()` is called, and answers 503 once shutdown begins or `start()` fails. ([#364](https://github.com/seedcord/seedcord/pull/364))
- A node bot now reads its public key from Discord at startup when `DISCORD_PUBLIC_KEY` is unset. If that read fails, startup throws `CoreDiscordReadFailed`. ([#381](https://github.com/seedcord/seedcord/pull/381))
- `attach` now throws `CorePluginScopeMismatch` when a plugin's transport or runtime differs from the bot's, even when a cast or plain JS gets past the types. A plugin that narrows either one, like `Plugin<{ runtime: 'server' }>`, now has to pass the same value to `super()`, for example `super(host, { runtime: 'server' })`. ([#363](https://github.com/seedcord/seedcord/pull/363))
- The gateway and node http `Seedcord` now work with `await using`. When the block ends, the bot runs its shutdown without calling `process.exit`. ([#364](https://github.com/seedcord/seedcord/pull/364))
- `@seedcord/gateway` and `@seedcord/http` now export `HmrModuleHandler`, so a plugin in your bot's own code can import it without depending on `@seedcord/core`. ([#413](https://github.com/seedcord/seedcord/pull/413))
- Added `readFiles` for bots and plugins that read json, markdown, images, or other non-code files from a folder that `files` in `seedcord.config.ts` lists, in dev and in a built bot alike. Each file comes back as a `Buffer`, and `bytes.toString()` turns a text file into a string. `@seedcord/gateway` and `@seedcord/http` now export `readFiles` and `importFiles` too (#410). ([#358](https://github.com/seedcord/seedcord/pull/358))

### 🩹 Patch

- Fixed `attach` rejecting a free key like `token` as already taken, as in `seedcord.attach('token', MyPlugin)` on an http bot. ([#362](https://github.com/seedcord/seedcord/pull/362))
- Fixed a bot failing to start when Discord held its command deploy longer than 10 seconds, like on a third restart within a minute. Startup now gives the deploy up to 75 seconds for Discord's rate limit to reset, and logs how long Discord makes it wait. ([#389](https://github.com/seedcord/seedcord/pull/389))
- Fixed `seedcord dev` sending an http bot's tunnel traffic to another program on the same port. With the default quick tunnel, the bot now listens on `127.0.0.1` only. ([#391](https://github.com/seedcord/seedcord/pull/391))
- An unknown fault now prints its whole stack in your terminal, since `errors.errorStack` defaults to `true`. Set `errorStack: false` for the one-line log. ([`2443eb9`](https://github.com/seedcord/seedcord/commit/2443eb9813945fcd8fd387411df7330676a2330e))
- Handler, middleware, command, subscriber, and service folders now load their files sorted by path. ([#358](https://github.com/seedcord/seedcord/pull/358))
- A node http bot now fails to start with `PortInUse` when another process already listens on its `port`. On macOS, outside a `seedcord dev` quick tunnel, the bot starts anyway if that process listens on `127.0.0.1` only. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed the node http server running the handler for a request that was still arriving when shutdown began. It now answers that request with 503. ([#364](https://github.com/seedcord/seedcord/pull/364))
- Fixed the node http server's shutdown waiting 5s and failing with `stop-http-server` timed out when a client kept its connection open. The server now closes that connection once it sends the response the client was waiting on. ([#364](https://github.com/seedcord/seedcord/pull/364))
- Fixed `seedcord codegen`, `seedcord build`, and `seedcord commands` each writing a log file under `logs/` in development. A bot now applies its `logger` config, along with the default log file, when `start()` runs. ([`b3d661a`](https://github.com/seedcord/seedcord/commit/b3d661a9ff02ab15c3b40aaea5dd786c79d9bc9c))
- Fixed a bot that failed to start still deploying its commands later, once Discord's rate limit cleared. ([#389](https://github.com/seedcord/seedcord/pull/389))

#### 📦 Seedcord packages

- `@seedcord/core` 0.11.0-next.0 → 0.11.0
- `@seedcord/custom-id` 0.3.0-next.0 → 0.3.0
- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/event-emitter` 0.1.9-next.0 → 0.2.0
- `@seedcord/logger` 0.5.0-next.1 → 0.5.0
- `@seedcord/rate-limiter` 0.1.13-next.0 → 0.2.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0
- `@seedcord/utils` 0.9.0-next.1 → 0.9.0

## 0.10.2

### 🩹 Patch

- Fixed an edge bot throwing at a worker's global scope, because its REST client started sweeper timers there. ([#357](https://github.com/seedcord/seedcord/pull/357))
- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))
- Added `bot.restOptions` to the http config to configure the Discord REST client. An edge config can't set `hashSweepInterval` or `handlerSweepInterval`, because workerd throws when their timers start at a worker's global scope. ([#357](https://github.com/seedcord/seedcord/pull/357))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.4 → 0.10.0
- `@seedcord/custom-id` 0.2.6 → 0.2.7
- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/event-emitter` 0.1.7 → 0.1.8
- `@seedcord/logger` 0.4.3 → 0.4.4
- `@seedcord/rate-limiter` 0.1.11 → 0.1.12
- `@seedcord/types` 0.14.3 → 0.14.4
- `@seedcord/utils` 0.8.16 → 0.8.17

## 0.10.1

### 🩹 Patch

- Fixed `seedcord.config.botColor` having no effect when you assign it after `new Seedcord()`. If you load the color after startup, like from a settings file, every embed and container you send after that will use it. ([`9dc8b19`](https://github.com/seedcord/seedcord/commit/9dc8b191723a547ac29c3bcc356f22a8e35cea98))
- Fixed a type error when you assign a config key like `botColor` or `ownerIds` to `seedcord.config` on an http bot. TypeScript rejected any optional key that your `new Seedcord()` call left out. ([`ad8197d`](https://github.com/seedcord/seedcord/commit/ad8197de8d60e20042c5f273fab2630563a7bfd5))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.3 → 0.9.4
- `@seedcord/types` 0.14.2 → 0.14.3

## 0.10.0

### ✨ Minor

- `createSeedcord` now takes a manifest of handler, middleware, and subscriber classes, dropping the route rows and their lazy module loading. An entry in the wrong array, or one carrying no decorator, throws while the engine builds. ([#312](https://github.com/seedcord/seedcord/pull/312))

### 🩹 Patch

- Fixed the `Class 'Seedcord' incorrectly implements interface 'Core'` error that a bot with a plugin attached got with `skipLibCheck` off. ([#340](https://github.com/seedcord/seedcord/pull/340))
- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/core` 0.9.2 → 0.9.3
- `@seedcord/custom-id` 0.2.5 → 0.2.6
- `@seedcord/event-emitter` 0.1.6 → 0.1.7
- `@seedcord/logger` 0.4.2 → 0.4.3
- `@seedcord/rate-limiter` 0.1.10 → 0.1.11
- `@seedcord/types` 0.14.1 → 0.14.2
- `@seedcord/utils` 0.8.15 → 0.8.16

## 0.9.2

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/core` 0.9.1 → 0.9.2
- `@seedcord/custom-id` 0.2.4 → 0.2.5
- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/event-emitter` 0.1.5 → 0.1.6
- `@seedcord/logger` 0.4.1 → 0.4.2
- `@seedcord/rate-limiter` 0.1.9 → 0.1.10
- `@seedcord/types` 0.14.0 → 0.14.1
- `@seedcord/utils` 0.8.14 → 0.8.15

## 0.9.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0
- `@seedcord/core` 0.9.0 → 0.9.1
- `@seedcord/utils` 0.8.13 → 0.8.14
- `@seedcord/logger` 0.4.0 → 0.4.1
- `@seedcord/custom-id` 0.2.3 → 0.2.4

## 0.9.0

### 💥 Breaking

- seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property. ([#327](https://github.com/seedcord/seedcord/pull/327))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.8.0 → 0.9.0
- `@seedcord/logger` 0.3.3 → 0.4.0
- `@seedcord/errors` 0.9.0 → 0.10.0
- `@seedcord/custom-id` 0.2.2 → 0.2.3
- `@seedcord/utils` 0.8.12 → 0.8.13

## 0.8.2

### 🩹 Patch

- Fixed the three narrowing rules in `SlashHandler.options`'s TSDoc showing as one paragraph on the reference site. ([`d18b3f2`](https://github.com/seedcord/seedcord/commit/d18b3f2b26776e576295c9ebcf3a7c8d6b3ba716))

## 0.8.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/core` 0.7.0 → 0.8.0
- `@seedcord/types` 0.13.0 → 0.14.0
- `@seedcord/utils` 0.8.11 → 0.8.12
- `@seedcord/custom-id` 0.2.1 → 0.2.2
- `@seedcord/logger` 0.3.2 → 0.3.3
- `@seedcord/rate-limiter` 0.1.8 → 0.1.9

## 0.8.0

### 💥 Breaking

- every handler constructor now takes a `DispatchContext`. ([#310](https://github.com/seedcord/seedcord/pull/310))

    The node host loads `InteractionMiddleware` from `bot.interactions.middlewares` and runs the chain over the handler's reply surface before its gates. Every middleware that started gets its `after()`, even when a gate refuses the interaction.

### ✨ Minor

- Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults. ([#311](https://github.com/seedcord/seedcord/pull/311))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.6.0 → 0.7.0
- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/rate-limiter` 0.1.7 → 0.1.8
- `@seedcord/utils` 0.8.10 → 0.8.11
- `@seedcord/custom-id` 0.2.0 → 0.2.1

## 0.7.0

### ✨ Minor

- Halved the drain window to 5000ms for http bots to the same window gateway uses. An http shutdown now completes there, where it used to report a failure. Both transports log how many handlers were still running when the window closed. ([#309](https://github.com/seedcord/seedcord/pull/309))

### 🩹 Patch

- The transport packages now export `prefixOf`, `decodeFor`, and the custom-id types. Reading a raw customId no longer needs `@seedcord/custom-id` as a direct dependency. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))

#### 📦 Seedcord packages

- `@seedcord/core` 0.5.0 → 0.6.0
- `@seedcord/custom-id` 0.1.1 → 0.2.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10
- `@seedcord/rate-limiter` 0.1.6 → 0.1.7

## 0.6.0

### 💥 Breaking

- Select menus get one decorator and one base per kind, so `@UserMenuRoute` pairs with `UserMenuHandler` as an example. `@SelectMenuRoute` and `SelectMenuKind` are removed, and `SelectMenuHandler` stays as the shared base your kind's base extends. Each base declares only the members its own menu resolves. Check the updated guide page for select menus. ([#303](https://github.com/seedcord/seedcord/pull/303))

### ✨ Minor

- A resolved pick now comes back as a `Collection`, matching gateway. This covers the select handler members and every `ModalFields` select getter. ([#303](https://github.com/seedcord/seedcord/pull/303))
- `InteractionKind` now ships from the package root. Use its members to compare against the `kind` you read off `interactionDispatched`. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.4.1 → 0.5.0
- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/custom-id` 0.1.0 → 0.1.1
- `@seedcord/utils` 0.8.8 → 0.8.9
- `@seedcord/rate-limiter` 0.1.5 → 0.1.6

## 0.5.1

### 🩹 Patch

- `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.0 (new)
- `@seedcord/core` 0.4.0 → 0.4.1
- `@seedcord/types` 0.10.0 → 0.10.1
- `@seedcord/errors` 0.5.0 → 0.5.1

## 0.5.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound. ([#295](https://github.com/seedcord/seedcord/pull/295))

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

### ✨ Minor

- A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind. ([#294](https://github.com/seedcord/seedcord/pull/294))
- `this.fields.getField(customId)` returns a modal field as Discord sent it, for a component kind the other getters do not cover yet. Naming a kind narrows the result. ([`27c022a`](https://github.com/seedcord/seedcord/commit/27c022a))
- Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now. ([`3ff40e7`](https://github.com/seedcord/seedcord/commit/3ff40e7))

### 🩹 Patch

- Fixed `Seedcord.attach()` not showing up in the documentation. ([`2cb3c87`](https://github.com/seedcord/seedcord/commit/2cb3c87))
- Export the winston sinks from both node entries. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Fix logger config not being used in an edge bot. ([`1fc18be`](https://github.com/seedcord/seedcord/commit/1fc18be))
- Fix TSDoc in `SlashHandler` and `getConfirmation`. They were showing the incorrect number of arguments for option getters. ([`58318fa`](https://github.com/seedcord/seedcord/commit/58318fa))
- A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host. ([#293](https://github.com/seedcord/seedcord/pull/293))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/core` 0.3.1 → 0.4.0
- `@seedcord/event-emitter` 0.1.4 → 0.1.5
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8
- `@seedcord/rate-limiter` 0.1.4 → 0.1.5

## 0.4.1

### 🩹 Patch

- A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports. ([#289](https://github.com/seedcord/seedcord/pull/289))

#### 📦 Seedcord packages

- `@seedcord/core` 0.3.0 → 0.3.1
- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.4.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.1 → 0.3.0
- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.3.1

### 💥 Breaking

- A transport plugin base no longer accepts `transport: 'any'` and the gateway base no longer accepts `runtime: 'edge'`. Extend `@seedcord/core/plugin` for a plugin that runs on either transport. This IS a bug fix. This should not have been allowed before. ([`9c8e66a`](https://github.com/seedcord/seedcord/commit/9c8e66a))

### 🩹 Patch

- Fixed a gate mismatch on a Button or Modal handler labelling the handler `StringSelect`. Every interaction kind now reports its own label. ([#273](https://github.com/seedcord/seedcord/pull/273))
- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.0 → 0.2.1
- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/rate-limiter` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.3.0

### 💥 Breaking

- sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`. ([`aa6bb3a`](https://github.com/seedcord/seedcord/commit/aa6bb3a))
- `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`. ([`5c7c3e2`](https://github.com/seedcord/seedcord/commit/5c7c3e2))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers. ([#244](https://github.com/seedcord/seedcord/pull/244))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/core` 0.1.4 → 0.2.0
- `@seedcord/event-emitter` 0.1.2 → 0.1.3
- `@seedcord/rate-limiter` 0.1.2 → 0.1.3
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.2.3

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.3 → 0.1.4
- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/rate-limiter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.2.2

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))
- Export other useful packages from http transport like how gateway does ([#236](https://github.com/seedcord/seedcord/pull/236))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/core` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.2.1

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.1 → 0.1.2
- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/rate-limiter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.2.0

### 💥 Breaking

- `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check. ([#230](https://github.com/seedcord/seedcord/pull/230))
- `start()` takes no arguments. Declare the interactions port as `port` on the config. ([#230](https://github.com/seedcord/seedcord/pull/230))

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Both transports now trace the elapsed time of each dispatched interaction and each reply write. ([#234](https://github.com/seedcord/seedcord/pull/234))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- A dispatched interaction now logs its route and handler at debug like the gateway. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Loads `reflect-metadata` from the package entry. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 → 0.1.1
- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/rate-limiter` 0.1.0 → 0.1.1

## 0.1.0

### 💥 Breaking

- Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/http`, an HTTP-interactions receiver for a node server or an edge worker (edge worker build is WIP). ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `new Seedcord(config).start(port)` runs a node host with handler discovery, dev HMR, a health server, coordinated shutdown, and plugin `attach`. Edge builds import `createSeedcord` from `@seedcord/http/edge`, which verifies the Ed25519 signature over the raw bytes, rejects stale and replayed requests, and dispatches through a generated route manifest.

    Handlers carry the same reply surface, gates, typed options, customId decoding, emoji and command accessors, and pagination as gateway.

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 (new)
- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/rate-limiter` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0
