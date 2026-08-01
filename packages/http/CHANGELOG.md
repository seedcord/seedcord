# @seedcord/http

## 0.1.0-next.2

### Minor Changes

- 9ff4e85: **BREAKING:** the subscriber surface moves from `@seedcord/gateway` to `@seedcord/core`, and both transports re-export it. `Subscriber` and `WebhookLog` now bind their transport's `Core`, so a bot author writes the same one type argument as before.

    Each bot instance keeps its own fault-throttle window, so two bots in one process stop suppressing each other's reports.

    `core.bus` is available on both transports. Subscribers on one key run concurrently with no ordering guarantee. A webhook attachment carries `Uint8Array | string`, which a `Buffer` still satisfies.

- 44b6d72: **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `this.core.username`, `this.core.augmentTarget`, and `this.core.start()` are gone from handlers. The host class still carries all four.

    Gateway's `Core` narrows `shutdown` and `startup` to `addTask`. Read the rest off the instance you constructed, whose `shutdown` and `startup` are now public.

    The HTTP `Core` carries neither coordinator, matching the edge runtime that has no lifecycle.

- f0ba9f3: Framework log lines carry a per-subsystem channel. `config.logger.channels` is typed by the `FrameworkChannel` set and still accepts any string.
- 9dba6ea: `anyInteraction` publishes for every verified interaction before routing, carrying the raw `APIInteraction`.

    Autocomplete choices responses publish `responseAttempted`.

    An unmatched route keeps the attempted command name, so `routeId` reads `slash:inventory` where it read `slash:unhandled`.

    A dispatch that throws past the boundary publishes `unhandledInteractionError`, which gateway already did.

    The http boundary now publishes faults on the bus, matching gateway. A reported `Notice` publishes `handledException` with an interaction source built from the raw payload, and a raw throw publishes `unknownException`. Both go through the same 60s per-route throttle gateway uses.

- 44b6d72: **BREAKING:** Every `RouteManifest` key takes a `Routes` suffix (`commands` becomes `commandRoutes`), and a fifth `middlewareRoutes` list joins them. Each row now carries `exportName` and `from`, and `load` returns the module.

    Each row resolves to the class its `exportName` gives, even when one file exports two handler classes. Before this, both rows reached whichever class appeared first in the module.

- 479ed72: **BREAKING:** `PluginOptions.transport` and `.runtime` take `'any'` in place of `'both'`. `'any'` is the default for both axes, so a plugin that declares neither is unaffected.

    **BREAKING:** `attach` now rejects a plugin whose declared `transport` or `runtime` the host does not run, and an edge host rejects every plugin. The error message contains the plugin's declared value and the bot's.

    A plugin declaring any of `transport`, `runtime`, or `needs` can now be attached. Before this, `attach` accepted only plugins that declared no options.

    `new Seedcord(config)` on http reads its runtime from the config it is constructed with. A config typed as the whole `HttpConfig` union leaves the host on both runtimes and it accepts no plugins, so narrow the config to `HttpServerConfig` to attach.

- 464438f: Both transports now export a `Plugin` base bound to their own `Core`, so a plugin reads `this.core.bot` on gateway and `this.core.rest` on http with no `Core` import. A plugin that runs on either transport keeps extending the base from `@seedcord/core/plugin`, whose `this.core` carries the shared members.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter. Naming a transport `Core` there is a compile error at `attach`. Read the transport type off `this.core`.

    Every attach gate reports as a sentence naming both values, for example `this plugin declares transport 'http' and this bot runs 'gateway'`.

    **BREAKING:** a transport the imported base does not serve is a compile error on the type argument, so `Plugin<{ transport: 'http' }>` from `@seedcord/gateway` is rejected where it is declared.

    **BREAKING:** `Mongo` and `KyselyPg` declare `transport: 'gateway'` and no longer expose a public `core`.

### Patch Changes

- 44b6d72: `createSeedcord`, `createCore`, and `Core.config` use `HttpConfig` in place of the shared `Config`.
- 44b6d72: **BREAKING:** Two rows resolving to the same route now throw on the edge path, reporting the export and the file of both. The filesystem loaders already threw.

    The un-built `@seedcord/http/manifest` stub used to throw at module evaluation. It now throws when a route list is read, so the stack points at the code that read it.

- 4f11816: Doc examples and docs search targets use the renamed plugin classes.
- Updated dependencies [f0ba9f3]
- Updated dependencies [9ff4e85]
- Updated dependencies [44b6d72]
- Updated dependencies [9dba6ea]
- Updated dependencies [44b6d72]
- Updated dependencies [9ff4e85]
- Updated dependencies [f0ba9f3]
- Updated dependencies [53d5cac]
- Updated dependencies [6c35827]
- Updated dependencies [479ed72]
- Updated dependencies [464438f]
- Updated dependencies [4f11816]
- Updated dependencies [f0ba9f3]
- Updated dependencies [4f11816]
- Updated dependencies [9ff4e85]
- Updated dependencies [44b6d72]
    - @seedcord/core@0.1.0-next.7
    - @seedcord/errors@0.3.0-next.6
    - @seedcord/types@0.8.0-next.8
    - @seedcord/logger@0.1.0-next.3
    - @seedcord/utils@0.8.0-next.8
    - @seedcord/rate-limiter@0.1.0-next.5

## 0.1.0-next.1

### Minor Changes

- 25b58be: `new Seedcord(config).start(port)` runs an HTTP-interactions bot on a node server: handler discovery from `config.bot.interactions.path`, dev HMR, a health server, coordinated shutdown with an in-flight drain, and plugin `attach`. `HttpConfig` discriminates on `runtime`, node-server options are compile errors on the `'edge'` arm. `this.api` on handlers is the typed Discord API (`@discordjs/core/http-only`) over the shared REST client. Edge builds import from `@seedcord/http/edge`.

### Patch Changes

- Updated dependencies [25b58be]
- Updated dependencies [8e33bf4]
- Updated dependencies [25b58be]
    - @seedcord/core@0.1.0-next.6
    - @seedcord/types@0.8.0-next.7
    - @seedcord/errors@0.3.0-next.5
    - @seedcord/logger@0.1.0-next.2
    - @seedcord/rate-limiter@0.1.0-next.4
    - @seedcord/utils@0.8.0-next.7

## 0.1.0-next.0

### Minor Changes

- b03c8cd: **BREAKING:** the `BaseHandler` class is removed from the package root, `@seedcord/core` defines it now. Import it from `@seedcord/core` instead. The type unions (`ValidInteractionTypes`, `Repliables`) are unchanged.
- 3817214: Component and modal handlers decode customIds: the route decorators (exported from the package root) register the definitions, and `this.params` / `this.match` read the decoded values.

    **BREAKING:** `SelectMenuHandler` takes the select kind as its first generic (`SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]>`) and narrows `event.data` to that kind. The manifest row types are removed from the package root exports, `RouteManifest` stays, and the `AutocompleteRoute` identifier now names the decorator.

- 701b669: Add the gate surface: the `@Gated` decorator with per-kind matching (autocomplete handlers and `{ in: 'guild' }` permission gates are compile errors), and a dev-only warning when a dispatch's gate checks run past 750ms of the 3s ack budget combined, naming each gate's share. The root barrel now re-exports the whole `@seedcord/core` surface.

    Gates don't run on autocomplete interactions, matching the gateway dispatcher.

- e17f818: New `@seedcord/http` package, the HTTP-interactions receiver. `createSeedcord()` returns a `(request: Request) => Promise<Response>` handler that verifies the Ed25519 signature over the raw request bytes (WebCrypto, no `node:crypto`), rejects timestamps more than five minutes from the receiver clock and exact replays of an accepted signature with 401, answers a PING with an in-body PONG, and acks every other interaction with an empty 202. Dispatch to handlers is unbuilt. A verified interaction is logged and dropped after the ack. The public key is read from `DISCORD_PUBLIC_KEY` through envapt, missing or malformed values throw at construction.
- c959e1a: `reply()` and `update()` throw the registered `ReplyCallbackMissingMessage` error when the interaction callback carries no created message. `this.delete()` removes the initial reply or a message the interaction sent.
- 137e641: Add the reply surface and manifest dispatch. Handler bases (`SlashHandler`, `ContextMenuHandler`, `ButtonHandler`, `SelectMenuHandler`, `ModalHandler`, `AutocompleteHandler`) reply through `this.reply` / `defer` / `followUp` / `edit` / `send`, component kinds add `update` / `deferUpdate`, non-modal kinds add `showModal`. Matched interactions run their gates before the ack and `execute()` continues past the 202.

    **BREAKING:** `createSeedcord(config, manifest)` replaces the zero-arg form and reads `DISCORD_BOT_TOKEN` at construction.

- 3817214: The handler bases read typed options off the raw payload: `SlashHandler` adds `options` and `match`, `AutocompleteHandler` adds `focused`, `match`, `options`, and `route`. A channel option declared with `addChannelTypes` narrows `getChannel` to the matching resolved-channel subtype.

    **BREAKING:** `ContextMenuHandler` takes a kind generic (`ApplicationCommandType.User` or `Message`) and exposes `target` and `targetMember`.

### Patch Changes

- b03c8cd: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt 8.1. A bot declaring its own envapt needs `^8.1.0` there too, an older pin installs a second copy whose `Envapter` state (the bound source, the detected environment) splits from the framework's.
- Updated dependencies [3817214]
- Updated dependencies [137e641]
- Updated dependencies [b03c8cd]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [e17f818]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
- Updated dependencies [b03c8cd]
- Updated dependencies [c89adde]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [701b669]
- Updated dependencies [137e641]
- Updated dependencies [137e641]
- Updated dependencies [3817214]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
- Updated dependencies [5ec46ca]
    - @seedcord/errors@0.3.0-next.4
    - @seedcord/core@0.1.0-next.5
    - @seedcord/types@0.8.0-next.6
    - @seedcord/utils@0.8.0-next.6
    - @seedcord/logger@0.1.0-next.1
    - @seedcord/rate-limiter@0.1.0-next.3
