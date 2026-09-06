# @seedcord/plugin-kysely-postgres

## 0.4.0

### Minor Changes

- f89d8c9: **BREAKING:** Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this.

### Patch Changes

- Updated dependencies [af1b2f8]
- Updated dependencies [f89d8c9]
    - @seedcord/errors@0.6.0
    - @seedcord/types@0.11.0
    - @seedcord/logger@0.3.0
    - @seedcord/utils@0.8.9

## 0.3.0

### Minor Changes

- 1bf7d89: **BREAKING:** an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected.

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

### Patch Changes

- 554129a: The `kysely` and `pg` peer ranges now start at `^0.29.4` and `^8.22.0`.
- Updated dependencies [1bf7d89]
- Updated dependencies [9b6a31c]
- Updated dependencies [9b6a31c]
- Updated dependencies [5b15463]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [0ad8bd1]
- Updated dependencies [64c9a0e]
- Updated dependencies [e4e8605]
- Updated dependencies [554129a]
    - @seedcord/errors@0.5.0
    - @seedcord/logger@0.2.2
    - @seedcord/types@0.10.0
    - @seedcord/utils@0.8.8

## 0.2.1

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [1d2f1e3]
    - @seedcord/errors@0.4.1
    - @seedcord/logger@0.2.1
    - @seedcord/utils@0.8.6
    - @seedcord/types@0.9.1

## 0.2.0

### Patch Changes

- 97b62ef: Update log colors in some places.
- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
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
- Updated dependencies [1364c82]
    - @seedcord/errors@0.4.0
    - @seedcord/logger@0.2.0
    - @seedcord/types@0.9.0
    - @seedcord/utils@0.8.5

## 0.1.4

### Patch Changes

- 71a0b99: _Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
- Updated dependencies [71a0b99]
- Updated dependencies [8e8e952]
- Updated dependencies [527a465]
    - @seedcord/logger@0.1.4
    - @seedcord/errors@0.3.4
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.4

## 0.1.3

### Patch Changes

- 9b0a6a6: 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing.
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
    - @seedcord/errors@0.3.3
    - @seedcord/logger@0.1.3
    - @seedcord/utils@0.8.3

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/errors@0.3.2
    - @seedcord/logger@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.1.1

### Patch Changes

- c567fea: Bump deps.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- d470ad4: Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [c567fea]
- Updated dependencies [814902a]
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1

## 0.1.0

### Minor Changes

- 53d5cac: New `@seedcord/plugin-kysely-postgres`, replacing the kysely surface from `@seedcord/plugins`. It attaches to a gateway bot and to an http server bot.

    Augment `KyselyDatabase` with your schema once, then `KyselyService<'users'>` resolves against it. A failure after the pool opens closes it before `init()` rejects.

### Patch Changes

- Updated dependencies [789f17a]
- Updated dependencies [701b669]
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
