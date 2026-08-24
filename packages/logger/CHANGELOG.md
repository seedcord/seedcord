# @seedcord/logger

## 0.2.1

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [1d2f1e3]
    - @seedcord/errors@0.4.1
    - @seedcord/utils@0.8.6
    - @seedcord/types@0.9.1

## 0.2.1-next.0

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [1d2f1e3]
    - @seedcord/errors@0.4.1-next.0
    - @seedcord/utils@0.8.6-next.0
    - @seedcord/types@0.9.1-next.0

## 0.2.0

### Minor Changes

- e11cbb3: **BREAKING:** `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these.

### Patch Changes

- 97b62ef: Update log colors in some places.
- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- 1364c82: Render aggregate errors
- Updated dependencies [1364c82]
- Updated dependencies [97b62ef]
- Updated dependencies [aa6bb3a]
- Updated dependencies [7553449]
- Updated dependencies [f39cde0]
- Updated dependencies [a259cdc]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c343f4a]
- Updated dependencies [e11cbb3]
    - @seedcord/errors@0.4.0
    - @seedcord/types@0.9.0
    - @seedcord/utils@0.8.5

## 0.1.4

### Patch Changes

- 71a0b99: _Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
- Updated dependencies [8e8e952]
- Updated dependencies [527a465]
    - @seedcord/errors@0.3.4
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.4

## 0.1.3

### Patch Changes

- dfd7dc2: Moved `paint` to the errors package
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
    - @seedcord/errors@0.3.3
    - @seedcord/utils@0.8.3

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.1.1

### Patch Changes

- c567fea: Bump deps.
- c567fea: Set all packages' node floor to LTS.
- 814902a: The logger now catches a sink that throws. Your logging call returns normally, the other sinks still get the record, and the broken sink is reported once on the console.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [c567fea]
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/logger`. `Logger` assembles a record and routes it through a level gate and two sink layers.

    The core has no `node:*` imports and runs in edge workers. The winston console and file sinks come from `@seedcord/logger/node` and is set up automatically during dev.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [93544a8]
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
