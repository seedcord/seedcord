# @seedcord/http

## 0.2.1

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/core@0.1.2
    - @seedcord/errors@0.3.2
    - @seedcord/logger@0.1.2
    - @seedcord/rate-limiter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.2.0

### Minor Changes

- 0642de5: **BREAKING:** `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check.
- 0642de5: **BREAKING:** `start()` takes no arguments. Declare the interactions port as `port` on the config.

### Patch Changes

- c567fea: Bump deps.
- 814902a: Both transports now trace the elapsed time of each dispatched interaction and each reply write.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- d470ad4: A dispatched interaction now logs its route and handler at debug like the gateway.
- c567fea: Loads `reflect-metadata` from the package entry.
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
    - @seedcord/rate-limiter@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`.

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- 789f17a: New `@seedcord/http`, an HTTP-interactions receiver for a node server or an edge worker (edge worker build is WIP).

    `new Seedcord(config).start(port)` runs a node host with handler discovery, dev HMR, a health server, coordinated shutdown, and plugin `attach`. Edge builds import `createSeedcord` from `@seedcord/http/edge`, which verifies the Ed25519 signature over the raw bytes, rejects stale and replayed requests, and dispatches through a generated route manifest.

    Handlers carry the same reply surface, gates, typed options, customId decoding, emoji and command accessors, and pagination as gateway.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
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
- Updated dependencies [93544a8]
    - @seedcord/core@0.1.0
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/rate-limiter@0.1.0
