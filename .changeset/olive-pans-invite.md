---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': patch
'seedcord': minor
'@seedcord/eslint-plugin': minor
---

**BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.
