# @seedcord/eslint-plugin

## 0.3.1

### Patch Changes

- af1b2f8: `interaction-handler-missing-route` and `no-raw-interaction-acks` now match the per-kind select menu bases.

## 0.3.0

### Minor Changes

- a46a7dd: **BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.

## 0.2.1

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [1d2f1e3]
    - eslint-plugin-discordjs@0.1.4

## 0.2.0

### Minor Changes

- c343f4a: New `use-paint-in-logs` rule flags chalk inside a logger call and points you at the `paint` tones from `@seedcord/errors`.

### Patch Changes

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- c75f837: Relocated the folder in the monorepo.
- Updated dependencies [a259cdc]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c75f837]
    - eslint-plugin-discordjs@0.1.3

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - eslint-plugin-discordjs@0.1.2

## 0.1.1

### Patch Changes

- c567fea: Set all packages' node floor to LTS.
- Updated dependencies [c567fea]
    - eslint-plugin-discordjs@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/eslint-plugin`, type-aware rules that catch seedcord footguns before runtime.

    Exports `recommended` and a `seedcord` preset layering it over eslint-plugin-discordjs. The rules cover missing route and registration decorators, raw discord.js acknowledgement calls, and discord.js builder imports.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
    - eslint-plugin-discordjs@0.1.0
