# @seedcord/plugin-mongoose

## 0.1.0-next.1

### Patch Changes

- Updated dependencies [b586a14]
- Updated dependencies [58ee649]
- Updated dependencies [b586a14]
- Updated dependencies [c26ec13]
    - @seedcord/errors@0.3.0-next.7
    - @seedcord/utils@0.8.0-next.9
    - @seedcord/logger@0.1.0-next.4

## 0.1.0-next.0

### Minor Changes

- 8890a84: **BREAKING:** `@RegisterMongooseModel` is removed. Declare the schema as a plain `public static schema` member and a class without one is a compile error. The model name comes from the service key, with a `modelName` option on `@RegisterMongooseService` to override it.

    The plugin builds the model after the connection opens.

- 2565eba: The mongoose plugin ships as its own package, and it attaches to a gateway bot and to an http server bot. It replaces the mongoose surface from `@seedcord/plugins`, where the class was `Mongo` and every export carried a `Mongo` prefix.

    **BREAKING:** `stop()` is now `dispose()`. The plugin declares its shutdown step, so the host runs it only when `init()` resolved.

    **BREAKING:** `MongooseService` takes `CoreBase` as its second constructor parameter.

    Model cleanup covers only the models this plugin registered, leaving the rest of the mongoose registry alone.

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
