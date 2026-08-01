# @seedcord/plugin-kysely-postgres

## 0.1.0-next.0

### Minor Changes

- 53d5cac: The kysely Postgres plugin ships as its own package, and it attaches to a gateway bot and to an http server bot. It replaces the kysely surface from `@seedcord/plugins`, where the class was `KyselyPg` and every export carried a `Kpg` prefix.

    **BREAKING:** augment `KyselyDatabase` with your schema once. `KyselyPostgres` takes no type argument, `KyselyService<MyDatabase, 'users'>` becomes `KyselyService<'users'>`, and a table disagreeing with the one `@RegisterKyselyService` resolves to is a compile error.

    **BREAKING:** `stop()` is now `dispose()`. The plugin declares its shutdown step, so the host runs it only when `init()` resolved.

    **BREAKING:** `KyselyService` takes `CoreBase` as its second constructor parameter.

    A failure after the pool opens closes it before `init()` rejects.

### Patch Changes

- Updated dependencies [f0ba9f3]
- Updated dependencies [44b6d72]
- Updated dependencies [9ff4e85]
- Updated dependencies [f0ba9f3]
- Updated dependencies [53d5cac]
- Updated dependencies [4f11816]
- Updated dependencies [9ff4e85]
- Updated dependencies [44b6d72]
    - @seedcord/errors@0.3.0-next.6
    - @seedcord/types@0.8.0-next.8
    - @seedcord/logger@0.1.0-next.3
    - @seedcord/utils@0.8.0-next.8
