# @seedcord/plugin-kysely-postgres

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
