# @seedcord/core

## 0.1.0-next.1

### Minor Changes

- b384e8f: Move the component builders (`BuilderComponent`, `RowComponent`) and the bot color into `@seedcord/core`, now built on `@discordjs/builders`. The builders were previously imported from discord.js.
- 7f4fb2e: Dissolve `@seedcord/kit` into `@seedcord/core`. The Notice stop tree, the customId codec, and pagination move into `@seedcord/core`, joining the component builders already there, and `@seedcord/kit` is removed.

    **BREAKING:** `@seedcord/kit` is removed. Import its former exports (`Notice`, `Fault`, `Silence`, `CustomId`, `paginate`, `PageView`, `BuilderComponent`, `RowComponent`) from `seedcord` or `@seedcord/core`.

### Patch Changes

- Updated dependencies [b384e8f]
    - @seedcord/errors@0.3.0-next.2
    - @seedcord/types@0.8.0-next.2

## 0.1.0-next.0

### Minor Changes

- 993f609: **BREAKING:** The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`.
