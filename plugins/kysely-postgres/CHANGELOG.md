# @seedcord/plugin-kysely-postgres

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [a46a7dd]
    - @seedcord/core@0.3.0-next.0
    - @seedcord/errors@0.4.2-next.0
    - @seedcord/logger@0.2.2-next.0
    - @seedcord/utils@0.8.7-next.0

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
