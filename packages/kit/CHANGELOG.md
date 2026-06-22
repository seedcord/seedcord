# @seedcord/kit

## 0.1.1-next.0

### Patch Changes

- bd3293c: tiny change in TSDoc to remove @throws for refusals
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - @seedcord/errors@0.2.0-next.0
    - @seedcord/types@0.7.0-next.0

## 0.1.0

### Minor Changes

- 6e39348: Add two published leaf packages.

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.

### Patch Changes

- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0
    - @seedcord/errors@0.1.0

## 0.1.0-next.0

### Minor Changes

- 6e39348: Add two published leaf packages.

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.

### Patch Changes

- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0-next.0
    - @seedcord/errors@0.1.0-next.0
