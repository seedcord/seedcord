# @seedcord/gateway

## 0.1.3

### Patch Changes

- 9b0a6a6: 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing.
- e894fbf: Also export the ComponentHandler from handlers index for AE
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
- Updated dependencies [9b0a6a6]
    - @seedcord/errors@0.3.3
    - @seedcord/logger@0.1.3
    - @seedcord/core@0.1.3
    - @seedcord/utils@0.8.3

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/core@0.1.2
    - @seedcord/errors@0.3.2
    - @seedcord/event-emitter@0.1.2
    - @seedcord/logger@0.1.2
    - @seedcord/rate-limiter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.1.1

### Patch Changes

- c567fea: Bump deps.
- 814902a: Both transports now trace the elapsed time of each dispatched interaction and each reply write.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- 5b57bda: A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one.
- d470ad4: Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [814902a]
- Updated dependencies [c567fea]
- Updated dependencies [5b57bda]
- Updated dependencies [0642de5]
- Updated dependencies [d470ad4]
- Updated dependencies [d470ad4]
- Updated dependencies [814902a]
    - @seedcord/core@0.1.1
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1
    - @seedcord/event-emitter@0.1.1
    - @seedcord/rate-limiter@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: `Commands` and `ContextMenus` join `Emojis` as module-level accessors filled during startup. `Commands` is keyed by slash route and `ContextMenus` splits into `user` and `message`.

    **BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import the accessors directly. Reading a key before startup resolves it will throw.

- 789f17a: **BREAKING:** the component builders are built on `@discordjs/builders`. Import any builder you nest inside a seedcord component from there too, because the copy discord.js re-exports is a separate class that breaks `instanceof`.

    **BREAKING:** `ControlCosmetics.emoji` takes an `APIMessageComponentEmoji` such as `{ name: '👍' }`. A bare string no longer type-checks.

- 789f17a: **BREAKING:** `core.bot` no longer emits events. The four keys moved to `core.bus` as `unhandledInteractionError`, `unhandledEventError`, `anyEvent`, and `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber.

    `interactionDispatched` and `responseAttempted` are new, and both carry `interactionId` so a subscriber can join them to calculate durations such as network time. `publish` rejects the framework's own keys.

    **BREAKING:** `AllSubscriptions` is no longer exported. Type a payload with `SubscriptionData<K>` if needed.

- 789f17a: **BREAKING:** `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` for the previous base-set behavior. They fit modal and event handlers now.

    **BREAKING:** `GateContextBase` is scalar (`userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`, `appPermissions`, `routeId`). A gate that read `ctx.user`, `ctx.guild`, or `ctx.member` reads the id scalars or annotates a gateway arm.

    `Cooldown` keys its window by route, so a durable store keeps it across restarts.

- 789f17a: **BREAKING:** the lifecycle phases are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`.

    **BREAKING:** the coordinators no longer emit events, and nothing replaces them. A task registered with `addTask` runs where the matching event fired. Gateway drains in-flight dispatch before the client disconnects.

    **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `username`, `augmentTarget`, and `start()` are gone from handlers. Read them off the instance you constructed.

- 789f17a: **BREAKING:** the gateway framework moved from `seedcord` to `@seedcord/gateway`. Its surface changed substantially in this release, so read the entries below before upgrading.
- 789f17a: Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`.

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- 789f17a: **BREAKING:** the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`.

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- 789f17a: Handlers reply through members on the base, `this.reply`, `defer`, `followUp`, `edit`, `delete`, and `send`, with `update` and `deferUpdate` on component kinds and `showModal` on non-modal kinds. Autocomplete handlers define `this.respond(choices)`.

    **BREAKING:** `ReplySender` is no longer exported. An unmatched interaction now gets a reply from an unhandled default, and a failed `getConfirmation` or `Paginator.start` send throws into the fault boundary.

- 789f17a: **BREAKING:** a `WebhookLog` subclass declares its url's env var with `@WebhookUrl` and implements `report()` returning `{ username?, components, files? }`. The abstract `webhook` field is removed.

    An unset url disables that reporter with a boot warning. A malformed one throws at boot, and a webhook Discord does not recognise stops the boot.

    **BREAKING:** the `unknownException` payload carries plain `guild` and `user` objects. Fetch anything else through the client.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
- 789f17a: Duplicate interaction routes and same-named middleware classes now throw at registration, where the later one used to overwrite the earlier silently.

    A `once` event handler no longer runs twice when its event fires concurrently. A throwing `core.bus.on()` listener no longer escapes `publish` or skips the listeners after it. Editing a subscriber file hot-reloads it in dev.

- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [701b669]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [93544a8]
    - @seedcord/core@0.1.0
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/event-emitter@0.1.0
    - @seedcord/rate-limiter@0.1.0

---

#### Versions below were published as `seedcord` before the split into scoped packages.

---

## 0.16.0-next.4

### Minor Changes

- 7174db3: New `CoreBase` in `@seedcord/core` with `config` and `rateLimiter`. The gateway `Core` extends it. `core.rateLimiter` is an async `IRateLimiter` backed by `MemoryRateLimiter`. `seedcord` re-exports `@seedcord/rate-limiter`. `SeedcordInstance` adds `version` and moves to `@seedcord/types/internal`.

    **BREAKING:** `@seedcord/types` no longer depends on discord.js. `clientOptions` and `events` move from `BotConfig` to `GatewayBotConfig` in `seedcord`, and the `Seedcord` constructor takes `GatewayConfig`. `Config.botColor` is a `BotColor`.

    **BREAKING:** `@seedcord/services` no longer exports `RateLimiter`, `RateLimitWindow`, or `RateLimitResult`. Use `MemoryRateLimiter` from `@seedcord/rate-limiter` and the types from `@seedcord/types`. `hit` is replaced by the async `charge`, and results carry `resetAt`, `remaining`, `retryAfterMs`.

- 7174db3: Gates move to `@seedcord/core`: `defineGate`/`defineEffectGate`, `and`/`or`, `OwnerOnly`/`GuildOnly`/`DmOnly`/`Cooldown`. `InteractionGateContext`/`EventGateContext`, the cache-reading gates, and `@Gated` stay in `seedcord`, which re-exports the moved pieces.

    **BREAKING:** `GateContextBase` is scalar: `core`, `userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`. A gate that read `ctx.user`/`ctx.guild`/`ctx.member` now reads the id scalars or annotates a gateway arm.

### Patch Changes

- 7174db3: Move the interaction metadata keys, the gate notices, and `RegisterCommand` from `seedcord` to `@seedcord/core`. `seedcord` re-exports them. `OnCooldown` is created with `resetAt` (renamed from the unpublished `expires`).
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
    - @seedcord/core@0.1.0-next.2
    - @seedcord/types@0.8.0-next.3
    - @seedcord/services@0.9.0-next.4
    - @seedcord/rate-limiter@0.1.0-next.0
    - @seedcord/utils@0.8.0-next.3
    - @seedcord/errors@0.3.0-next.2

## 0.16.0-next.3

### Minor Changes

- b384e8f: Build seedcord's component builders on `@discordjs/builders`. Import any builder you nest inside a seedcord component from `@discordjs/builders` too. The copy discord.js re-exports is a separate class that breaks `instanceof` and `toJSON`.

    **BREAKING:** `ControlCosmetics.emoji` (on `PaginatorControls.button`) narrows from `ComponentEmojiResolvable` to `APIMessageComponentEmoji`. Pass an emoji object like `{ name: '👍' }`. A bare string no longer type-checks.

### Patch Changes

- 7f4fb2e: Dissolve `@seedcord/kit` into `@seedcord/core`. The Notice stop tree, the customId codec, and pagination move into `@seedcord/core`, joining the component builders already there, and `@seedcord/kit` is removed.

    **BREAKING:** `@seedcord/kit` is removed. Import its former exports (`Notice`, `Fault`, `Silence`, `CustomId`, `paginate`, `PageView`, `BuilderComponent`, `RowComponent`) from `seedcord` or `@seedcord/core`.

- Updated dependencies [b384e8f]
- Updated dependencies [b384e8f]
- Updated dependencies [7f4fb2e]
    - @seedcord/errors@0.3.0-next.2
    - @seedcord/core@0.1.0-next.1
    - @seedcord/services@0.9.0-next.3
    - @seedcord/types@0.8.0-next.2
    - @seedcord/utils@0.8.0-next.2

## 0.16.0-next.2

### Patch Changes

- 993f609: **BREAKING:** The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`.
- Updated dependencies [993f609]
    - @seedcord/core@0.1.0-next.0
    - @seedcord/types@0.8.0-next.2
    - @seedcord/kit@0.3.0-next.2
    - @seedcord/services@0.9.0-next.2
    - @seedcord/utils@0.8.0-next.2

## 0.16.0-next.1

### Minor Changes

- c046193: **BREAKING:** require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer.

### Patch Changes

- c046193: Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change.
- Updated dependencies [c046193]
- Updated dependencies [d8b91f5]
- Updated dependencies [c046193]
    - @seedcord/services@0.9.0-next.1
    - @seedcord/utils@0.8.0-next.1
    - @seedcord/kit@0.3.0-next.1
    - @seedcord/types@0.8.0-next.1
    - @seedcord/errors@0.3.0-next.1

## 0.16.0-next.0

### Minor Changes

- 8635423: Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted.
- 8635423: A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`.

### Patch Changes

- 8635423: Register the subscriber bus for HMR so editing a subscriber file hot-reloads it in dev. The wiring existed but was never invoked, so subscriber edits silently needed a full restart.
- 8635423: Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one.
- 8635423: Fix a `once` event handler running twice when the same event fired concurrently. Two overlapping fires both passed the spent-handler check before either marked it spent.
- Updated dependencies [8635423]
- Updated dependencies [8635423]
- Updated dependencies [8635423]
    - @seedcord/errors@0.2.2-next.0
    - @seedcord/types@0.7.2-next.0
    - @seedcord/kit@0.2.1-next.0
    - @seedcord/services@0.8.3-next.0
    - @seedcord/utils@0.7.1-next.0

## 0.15.0

### Minor Changes

- c3613bd: Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use.
- c3613bd: Rename the `SelectHandler` base class to `SelectMenuHandler`, matching `SelectMenuRoute` and `SelectMenuKind`. Select-menu handlers should now extend `SelectMenuHandler`.

### Patch Changes

- 781eb3d: `@internal` now actually hides `__componentDefs` from the docs.
- 78377fa: mark some exports as internal so they don't show up in the docs
- 78377fa: add examples to some utils that should have them
- 51006e2: `__componentDefs` phantom field should be internal
- 78377fa: update LICENSE copyright year
- Updated dependencies [78377fa]
- Updated dependencies [c3613bd]
- Updated dependencies [0a19719]
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
    - @seedcord/utils@0.7.0
    - @seedcord/kit@0.2.0
    - @seedcord/errors@0.2.1
    - @seedcord/services@0.8.2
    - @seedcord/types@0.7.1

## 0.14.0

### Minor Changes

- 7121c18: Add a typed `bot.mentions` accessor that maps each registered slash route to a clickable command mention like `</name:id>`. A command deployed to two or more guilds falls back to plain `/name` text. `setCommands` now returns the deployed command collections.
- 7121c18: `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable.
- 7121c18: Type configured emojis precisely. `seedcord codegen` now writes an `EmojiMap` block that tags each key `'application'` or `'guild'`, and `Emojis.X` (and `bot.emojis.X`) resolves to the exact `ApplicationEmoji` or `GuildEmoji` rather than the union. Configure `config.bot.emojis` with the new `EmojiConfig` type and run `seedcord codegen`, you no longer hand-write the `EmojiMap` augmentation. The generated file is renamed from `command-registry.gen.ts` to `seedcord-gen.d.ts`, so delete the old file and re-run `seedcord codegen`.

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- 7121c18: Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands.
- Updated dependencies [043e2a1]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [bd3293c]
- Updated dependencies [7121c18]
    - @seedcord/services@0.8.1
    - @seedcord/utils@0.6.1
    - @seedcord/errors@0.2.0
    - @seedcord/types@0.7.0
    - @seedcord/kit@0.1.1

## 0.13.0

### Minor Changes

- 6e39348: Move error handling from the per-method `@Catchable`/`@EventCatchable` decorators to one controller boundary that catches every throw across the interaction and event lifecycle (middleware, construct, gate phase, execute).

    - A `Notice` renders through `ReplySender`, a reporting `Notice` and a raw error publish to `handledException`/`unknownException`, and a `Silence` stops silently. Events are report-only and never auto-reply.
    - Removes `@Catchable`, `@EventCatchable`, and the `setBreak`/`setErrored`/`shouldBreak`/`hasErrors` handler flags. Throw a `Silence` to stop a handler without a reply.
    - The default handled-exception subscriber requires the `HANDLED_EXCEPTION_WEBHOOK_URL` env var at boot.
    - `FaultSource` gains an `event` arm. Duplicate faults are throttled to one report per minute per route.
    - `ignoreCustomIds` is now `CustomIdMatcher[]`, matched against the raw customId. Adds `errors.ignoreApiCodes` and `errors.ignoreEventApiCodes` (both empty by default, so a handler's own discord.js api error reports).

- 3c94f9e: Rename `SelectMenuType` to `SelectMenuKind` because it clashes with djs' export
- 6e39348: Replace the database error path with a general `Fault`.

    - `DatabaseError` is removed. `Fault` replaces it, a public `Notice` in `@seedcord/kit` whose `report` defaults true and whose constructor takes `{ cause }`. A service catch rethrows `new Fault({ cause: e })`.
    - `@WrapDatabaseError` and `throwDatabaseError` are removed.

    To migrate, replace `@WrapDatabaseError` and `throwDatabaseError` with a `try`/`catch` in the service method that rethrows `new Fault({ cause: e })` or write a decorator that does the same.

- 6e39348: Add declarative preconditions and remove the manual check API.

    - `@Gated(...)` runs gate values before a handler. Build gates with `defineGate` and `defineEffectGate`, compose them with `and` and `or`, and use the built-in catalog (`Cooldown`, `OwnerOnly`, `GuildOnly`, `DmOnly`, `Nsfw`, `RequirePermissions`, `RequireBotPermissions`, `RequireRole`, `IgnoreBots`, and their inverses). A gate refuses by throwing a `Notice`.
    - `@Checkable`, `WithChecks`, and the user-written `runChecks` are removed.

    To migrate, move a reusable check into a `@Gated(...)` gate, or inline a one-off as `throw new SomeNotice()` in `execute()`.

- 3c94f9e: remove framework Notices from public exports
- 6e39348: Rework the error model around one base class and one reply shape.

    - `CustomError` is renamed to `Notice`, the abstract base you extend and throw. The `emit` field is renamed to `report`. The `response` field (a `readonly EmbedBuilder`) is replaced by a `render(ctx)` method that returns a `ReplyResponse`.
    - `ReplyResponse` is a new public type in `@seedcord/types`, a v2 reply shape of `components` plus optional `allowedMentions` and `files`. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`. `RenderContext` is the new render argument.

    To migrate, rename `CustomError` to `Notice`, rename `emit` to `report`, and replace the `response` field with a `render(ctx)` method returning a `ReplyResponse`.

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

- 6e39348: Clean up the handler API surface.

    - `getConfirmation(interaction, prompt, options?)` replaces the Confirmable decorator and its types. Gate an action with `if (!(await getConfirmation(...))) return`.
    - `populate()` is removed. The handler lifecycle runs construct, then gates, then `execute()`.
    - `attemptSendDM` and `sendInText` are removed. Resolve a channel with `fetchText`.

    To migrate, replace the Confirmable decorator with `getConfirmation`, move `populate()` setup to the top of `execute()`, and drop `attemptSendDM` and `sendInText`.

- 3c94f9e: Make IgnoreBots a Gate const instead of a Gate function

### Patch Changes

- 3c94f9e: fix mention of `SeedcordError`s in TSDoc
- 3c94f9e: some TSDoc updates
- 180b5a9: Upgrade the envapt runtime dependency to 6.0.0.
- 74ea604: HMR now explicitly also runs in the test environment, not only in development.
- 3c94f9e: Harden interaction routing against metadata-key collisions. Route metadata is now keyed by unique Symbols instead of plain strings, so a third-party `Reflect.defineMetadata` call using a generic string key can no longer overwrite a handler's routes.
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [180b5a9]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/services@0.8.0
    - @seedcord/types@0.6.0
    - @seedcord/errors@0.1.0
    - @seedcord/kit@0.1.0
    - @seedcord/utils@0.6.0

## 0.12.0

### Minor Changes

- 19bae0a: Warn at boot for any command route leaf with no registered `@SlashRoute` handler. The check runs after commands load in `Bot.init`, reads the same `routeLeavesOf` walk that `seedcord codegen` uses so the keys cannot diverge, and logs one warning per unhandled route rather than throwing.
- 19bae0a: - **BREAKING**: `InteractionHandler` is no longer part of the public API. Every interaction kind now has its own typed base, so extend `SlashHandler`, `ButtonHandler`, `ModalHandler`, `SelectHandler`, or `AutocompleteHandler` instead.
- 19bae0a: - **BREAKING**: removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`.
    - Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
    - Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.
- b1c36ff: - Add `checkbox`, `checkbox_group`, `checkbox_group_option`, `radio_group`, and `radio_group_option` builders to the public API.
    - **BREAKING**: Rename `ActionRowComponentType` to `RowType` for consistency with `BuilderType`
- 19bae0a: - **BREAKING**: removed `buildCustomId` from the component builders. Encode a customId with the `CustomId` chain instead, `new CustomId('approve').snowflake('userId').encode({ userId })`, which the typed component handlers decode back through `this.params`.
- 19bae0a: - Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry.
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING**: `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.
- 19bae0a: - Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name.
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING**: `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING**: `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.
- 19bae0a: - Add a typed customId system for buttons, modals, and select menus. Define a customId once with `new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny'])`, encode it onto a component, and read the decoded values back in the handler through `this.params` (single route) or `this.match` (several routes), fully typed end to end. Component handlers extend the new `ButtonHandler`, `ModalHandler`, and `SelectHandler` bases.
    - Components route by a stable prefix, so a customId minted before its shape changed still reaches its handler and replies with a `StaleCustomId` message instead of failing silently.
    - **BREAKING**: `@ButtonRoute`, `@ModalRoute`, and `@SelectMenuRoute` now take `CustomId` definitions instead of string prefixes. Passing a different definition to the decorator than the one in the handler's generic is a compile error.
    - **BREAKING**: removed `getArgs()` and `getArg()` from handlers, along with the `-` delimited positional customId arguments. Read decoded values from `this.params` or `this.match` instead.
- 19bae0a: - Type event middleware by the events it runs for. A middleware that lists a single event in `{ events }` and its `EventMiddleware` generic reads `this.event` as that event's payload tuple, fully typed. A middleware that spans several events, or omits `{ events }` to run for every event, reads `this.eventName` to know which event fired, and `this.event` is `never`, because a middleware runs the same for every event it handles and so has no `match`. The controller threads the fired event name into the middleware. The `{ events }` list and the `EventMiddleware` generic are cross-checked, so listing an event in one but not the other is a compile error in both directions.
    - **BREAKING**: on a middleware registered for two or more events, or a catchall with no `{ events }`, `this.event` is now `never`. Read `this.eventName` and do work that does not depend on the payload shape, or write one middleware per event to read a typed payload. Single-event middleware is unaffected.
- 19bae0a: - Add multi-event support to `EventHandler`. A handler registered for several events with `@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])` branches with `this.match`, keyed by event name, and each arm receives that event's payload as named parameters carrying the discord.js tuple labels, for example `messageUpdate: (oldMessage, newMessage) => ...`, fully typed, so a missing arm is a compile error and a param past the event's arity is a compile error. A single-event handler reads `this.event` as its payload tuple, unchanged. The controller threads the fired event name into the handler, so the branch is the real event that fired rather than a guess from the payload shape.
    - **BREAKING**: on a handler registered for two or more events, `this.event` is now `never`, so the previous hand-narrowing of the payload union no longer compiles. Branch with `this.match` instead. Single-event handlers are unaffected.
- 19bae0a: - Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route.
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING**: slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.

### Patch Changes

- 19bae0a: - Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI.
    - **BREAKING** (`@seedcord/cli`): the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
    - @seedcord/types@0.5.0
    - @seedcord/utils@0.5.0
    - @seedcord/services@0.7.1

## 0.11.0

### Minor Changes

- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- a34366b: **BREAKING**: rename `Effects` → pub-sub bus. `core.effects.emit` → `core.bus.publish`. `EffectsHandler` → `Subscriber`. `@RegisterEffect` → `@Subscribe`. `Effects` augmentation interface → `Subscriptions`. config key `effects` → `subscribers`. `EffectsConfig` → `SubscribersConfig`.
- 0083461: seedcord instance brand
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- 7308d36: `fetchGuildMember`, `fetchRole`, and `fetchText` now rethrow non-404 Discord errors instead of rebranding every failure as not-found. Controllers throw a `SeedcordError` when constructed without a handler path, and `StrictEventEmitter`-backed `Bus.publish` marks `once` subscribers before awaiting so a re-entrant publish cannot run them twice. `throwCustomError` is removed from the public API (its database-error path moved into `@seedcord/plugins`), and several `@internal` types are no longer exported.
- 7308d36: Move the non-secret startup settings from environment variables into the runtime config. `botColor`, `shutdownEnabled`, `healthCheck` (`port`/`path`/`host`), and `notifications.developerUsername` are now set through `new Seedcord({ ... })` instead of `DEFAULT_BOT_COLOR`, `SHUTDOWN_IS_ENABLED`, `HEALTH_CHECK_PORT`/`PATH`/`HOST`, and `DEVELOPER_DISCORD_USERNAME`. Secrets (bot token, exception webhook URL, Mongo URI) stay in the environment.

    The bot color is applied when a component is used rather than when it is constructed, so a configured color reaches every component regardless of construction order, and any `ColorResolvable` (hex string, number, named color, or RGB tuple) works. The default health-check port is 6967.

    **Breaking:** the framework no longer reads those four environment variables; move their values into the config object passed to `new Seedcord(...)`. The internal `hexToNumber` helper and its `UtilHexInputType` / `UtilHexInvalid` error codes are removed.

- a34366b: **BREAKING**: drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 2c4201b: Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
- d938005: bump deps
- cf9766d: make sure `@RegisterEffect` can only be used on an EffectHandler. this is the expected behavior so it isn't a breaking change.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [5a529d5]
- Updated dependencies [fe77998]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/services@0.7.0
    - @seedcord/types@0.4.0
    - @seedcord/utils@0.4.0
    - @seedcord/cli@0.1.0

## 0.10.6

### Patch Changes

- f8fbe70: discord.js was bumped a patch version
- f8fbe70: bump general dependencies
- Updated dependencies [f354d30]
- Updated dependencies [f8fbe70]
- Updated dependencies [f8fbe70]
    - @seedcord/services@0.6.0
    - @seedcord/types@0.3.5
    - @seedcord/utils@0.3.8

## 0.10.5

### Patch Changes

- 1d8986b: bump deps
- 1d8986b: bump djs to 14.25.0
- Updated dependencies [1d8986b]
- Updated dependencies [1d8986b]
    - @seedcord/types@0.3.4
    - @seedcord/utils@0.3.7
    - @seedcord/services@0.5.1

## 0.10.4

### Patch Changes

- eb7de1f: fix configurable behavior not deferring when defer: true is provided

## 0.10.3

### Patch Changes

- 398b08f: A previous change to make interaction handler routing decorators be very strict with types made it so that you couldn't use more than one on a single InteractionHandler anymore, which was a previous behavior that worked. This change now infers the types provided to the generic of InteractionHandler, extracts the type of the class, and compares it to the types expected by each decorator being used. It'll also tell you which one is missing in case of a mismatch.

## 0.10.2

### Patch Changes

- strictly type the SelectMenuRoute decorator on a select menu interaction handler based on the SelectMenuType passed in

## 0.10.1

### Patch Changes

- ce0d4bc: add inferred literal string type to buildCustomId method so the customId shows up on hover

## 0.10.0

### Minor Changes

- 2049570: you can now pass in a tuple to the emojis map like [emojiName, guildId] where both the values are strings. the injector will then look through cached guilds and inject the emoji from that guild.
- 6d12a7c: seedcord provided Emojis map will now either have the full ApplicationEmoji object, GuildEmoji object, or the provided string if an emoji is not found.
- 6fc2b8f: require all emojis in the EmojiMap to be provided in config
- c0bf149: **BREAKING**: replaced the checkPermissions param-based calls with an options-style api and overloads that now require passing the target (role or member) and context (guild or channel) explicitly; added inverse and custom error support so usage signatures have changed and previous direct calls will need updating

### Patch Changes

- 485670a: add optional custom error input for hasPermsToAssign function as well
- Updated dependencies [6e067da]
- Updated dependencies [c0bf149]
    - @seedcord/utils@0.3.6
    - @seedcord/services@0.5.0

## 0.9.1

### Patch Changes

- fix incorrect break on silent preventing unknownException effect from firing

## 0.9.0

### Minor Changes

- c27ca87: **BREAKING**: new option to silence caught errors in event handlers. you can now prevent the decorator from trying to send the error response in chat. The signature of the decorator has changed, making it a breaking change.

## 0.8.1

### Patch Changes

- debug logging for emoji injection

## 0.8.0

### Minor Changes

- a1a90e6: ignored key list for interactions now also accepts RegExp patterns.
- a1a90e6: core.bot will now emit some useful events. (unhandled errors and all events)
- a1a90e6: new StrictEventEmitter class. Plugin extends this now so strongly typed EventEmitter methods are available on all plugins. To use, pass a map of events as the generic to Plugin<here>.
- a1a90e6: **BREAKING**: strongly type routing decorators so they can only be applied to the correct handler classes
- a1a90e6: **BREAKING**: signature for the @RegisterEvent decorator has changed. It now accepts a list of event configs. Examples in its TSDoc.
- a1a90e6: **BREAKING**: global Emojis and augmentable interface for the same. better DX than mutating user's own Emojis object
- a1a90e6: (beta feature) new Confirmable decorator makes it very easy to require a confirmation before running the "execute" method in handlers
- a1a90e6: populate method that can be overridden to execute synchronous code. it's called at the end of the constructor in handlers.

### Patch Changes

- a1a90e6: logger instance in handlers available via this.logger
- a1a90e6: custom seedcord errors and error codes
- a1a90e6: better validation for UNKNOWN_EXCEPTION_WEBHOOK_URL
- a1a90e6: make sure that a registered command can only ever be guild OR global. this should not be breaking. If it is, your code was not following best practices.
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
    - @seedcord/services@0.4.0
    - @seedcord/utils@0.3.5

## 0.7.1

### Patch Changes

- fix "undefined" in log message on startup when registering events. will now show handler count per event in logging

## 0.7.0

### Minor Changes

- fix login before handlers were registering making some of them useless

## 0.6.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)
- Updated dependencies
    - @seedcord/services@0.3.3
    - @seedcord/types@0.3.3
    - @seedcord/utils@0.3.4

## 0.6.2

### Patch Changes

- bump discord.js version to latest
- Updated dependencies
    - @seedcord/services@0.3.2
    - @seedcord/types@0.3.2
    - @seedcord/utils@0.3.3

## 0.6.1

### Patch Changes

- fix logging for event handler. wrong ref to class name

## 0.6.0

### Minor Changes

- 615eac2: add 'once' and 'on' functionality when registering event handlers
- e48b386: add option to choose "once" or "on" for effects for triggering them

### Patch Changes

- Updated dependencies [d8b4c50]
    - @seedcord/utils@0.3.2

## 0.5.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent
- Updated dependencies [aaa59b7]
    - @seedcord/services@0.3.1
    - @seedcord/types@0.3.1
    - @seedcord/utils@0.3.1

## 0.5.0

### Minor Changes

- daf5dd9: new middlewares feature for both interactions and other events with priority sorting
- daf5dd9: added metadata to default UnknownException so it's easier to debug issues down the line in bots
- daf5dd9: better parsing and handling for DEFAULT_BOT_COLOR from env file as a hex string, or number, or a Discord.js Color string
- daf5dd9: buildSlashRoute method as an alternative to building the argument for command-based route decorators
- 0a74a7b: **BREAKING:** remove action row components for modals. (we are not following deprecations till seedcord v1 is out. minor versions will be breaking changes)
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages
- daf5dd9: **BREAKING:** utils in seedcord are no longer static methods on classes but standalone functions

### Patch Changes

- daf5dd9: some tsdoc for better info and documentation
- daf5dd9: improve type exports and tsdoc
- daf5dd9: update effects related docs for clarity
- daf5dd9: export missing classes and entities
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - @seedcord/services@0.3.0
    - @seedcord/types@0.3.0
    - @seedcord/utils@0.3.0

## 0.4.3

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- 5625037: add a way to specify HOST for healthcheck
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
    - @seedcord/services@0.2.2
    - @seedcord/types@0.2.2
    - @seedcord/utils@0.2.3

## 0.4.2

### Patch Changes

- Updated dependencies
    - @seedcord/utils@0.2.2

## 0.4.1

### Patch Changes

- bump deps
- Updated dependencies
    - @seedcord/services@0.2.1
    - @seedcord/types@0.2.1
    - @seedcord/utils@0.2.1

## 0.4.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - @seedcord/services@0.2.0
    - @seedcord/types@0.2.0
    - @seedcord/utils@0.2.0

## 0.3.0

### Minor Changes

- 2ada52b: update how emit stacks is handled via new config property
- 4585b73: config entry to be able to ignore specific custom-ids from the InteractionController
- 4611ac7: make commands registry maps public via bot. Also validate existence of bot token automatically

### Patch Changes

- e47636a: validate existence of unknown_interaction_url
- 8a7591a: bump deps
- ad2e3c3: use djs Collection object
- Updated dependencies [8a7591a]
    - @seedcord/services@0.1.1
    - @seedcord/types@0.1.4
    - @seedcord/utils@0.1.1

## 0.2.1

### Patch Changes

- move IDocument type export to the plugins package
- Updated dependencies
    - @seedcord/types@0.1.3

## 0.2.0

### Minor Changes

- dabf324: move services to its own package
- 0258dd5: add ComponentsV2 builders to BuilderComponent and a number utility

### Patch Changes

- 0ed832b: debug logging in emoji injector
- Updated dependencies [dabf324]
- Updated dependencies [f0650e8]
    - @seedcord/utils@0.1.0
    - @seedcord/services@0.1.0

## 0.1.1

### Patch Changes

- 72137e9: eslint issue fixes
- c188583: move buildCustomId method to BaseComponent so all components can access
- 5ac7d83: cleanup package files and bump deps
- Updated dependencies [5ac7d83]
    - @seedcord/types@0.1.2

## 0.1.0

### Minor Changes

- 2a141ec: Created a new package called @seedcord/plugins and moved mongo there
- d9e2a50: migrate to monorepo and first test for package
- 48a8c9b: renamed hooks to effects because these aren't lifecycle hooks but fire-and-forget side effects

### Patch Changes

- 8c4ce41: Added eslint for TSDoc
- 48a8c9b: add LICENSE to all package roots
- 48a8c9b: add TSDoc to almost everything
- Updated dependencies [d9e2a50]
- Updated dependencies [48a8c9b]
- Updated dependencies [8c4ce41]
- Updated dependencies [48a8c9b]
- Updated dependencies [48a8c9b]
    - @seedcord/types@0.1.0
