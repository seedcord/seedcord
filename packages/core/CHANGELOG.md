# @seedcord/core

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/errors@0.3.2
    - @seedcord/event-emitter@0.1.2
    - @seedcord/logger@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.1.1

### Patch Changes

- c567fea: Bump deps.
- 814902a: Both transports now trace the elapsed time of each dispatched interaction and each reply write.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- 0642de5: **BREAKING:** `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check.
- d470ad4: Per-phase lines are now debug and per-task lines are trace.
- d470ad4: Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [c567fea]
- Updated dependencies [814902a]
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1
    - @seedcord/event-emitter@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/core`, the transport-agnostic framework surface both `@seedcord/gateway` and `@seedcord/http` build on and re-export. The transport packages re-exporting most things from it though.
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

- 789f17a: Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`.

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- 789f17a: **BREAKING:** the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`.

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
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
- Updated dependencies [93544a8]
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/event-emitter@0.1.0
