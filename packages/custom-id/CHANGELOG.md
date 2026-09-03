# @seedcord/custom-id

## 0.1.0-next.0

### Minor Changes

- 71c1896: The typed customId codec ships here now, and it runs against plain discord.js as well as seedcord. Declare a shape with `new CustomId('prefix')`, mint a wire with `encode`, and read it back with `decode`. Check the guide page on CustomId.
- 71c1896: `setCustomIdErrors` replaces the two errors a failed decode throws. Return a `Notice` subclass from a seedcord bot to swap the card a stale or corrupt button shows.

### Patch Changes

- Updated dependencies [71c1896]
    - @seedcord/errors@0.5.1-next.0
