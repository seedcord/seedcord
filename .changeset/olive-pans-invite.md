---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': patch
'seedcord': minor
'@seedcord/eslint-plugin': minor
---

**BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry` with `{ options, cache }` rows, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. `@seedcord/eslint-plugin` now recognizes `UserContextMenuHandler` and `MessageContextMenuHandler`, each paired with its own route decorator. `interaction-handler-missing-route` and `no-raw-interaction-acks` now recognize these new handlers.
