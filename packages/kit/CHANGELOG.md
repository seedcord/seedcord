# @seedcord/kit

## 0.3.0-next.1

### Minor Changes

- c046193: **BREAKING:** require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer.

### Patch Changes

- c046193: Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change.
- Updated dependencies [d8b91f5]
- Updated dependencies [c046193]
    - @seedcord/types@0.8.0-next.1
    - @seedcord/errors@0.3.0-next.1

## 0.2.1-next.0

### Patch Changes

- Updated dependencies [8635423]
- Updated dependencies [8635423]
- Updated dependencies [8635423]
    - @seedcord/errors@0.2.2-next.0
    - @seedcord/types@0.7.2-next.0

## 0.2.0

### Minor Changes

- c3613bd: Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use.

### Patch Changes

- 0a19719: Remove unused exports.
- 78377fa: mark some exports as internal so they don't show up in the docs
- 78377fa: update LICENSE copyright year
- Updated dependencies [c3613bd]
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
    - @seedcord/errors@0.2.1
    - @seedcord/types@0.7.1

## 0.2.0-next.2

### Patch Changes

- 0a19719: Remove unused exports.

## 0.2.0-next.1

### Patch Changes

- 78377fa: mark some exports as internal so they don't show up in the docs
- 78377fa: update LICENSE copyright year
- Updated dependencies [78377fa]
- Updated dependencies [78377fa]
    - @seedcord/types@0.7.1-next.0
    - @seedcord/errors@0.2.1-next.1

## 0.2.0-next.0

### Minor Changes

- c3613bd: Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use.

### Patch Changes

- Updated dependencies [c3613bd]
    - @seedcord/errors@0.2.1-next.0

## 0.1.1

### Patch Changes

- bd3293c: tiny change in TSDoc to remove @throws for refusals
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - @seedcord/errors@0.2.0
    - @seedcord/types@0.7.0

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
