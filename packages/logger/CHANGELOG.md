# @seedcord/logger

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
