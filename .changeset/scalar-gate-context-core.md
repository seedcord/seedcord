---
'@seedcord/core': minor
'seedcord': minor
---

The gate machinery moves to `@seedcord/core`: `defineGate`/`defineEffectGate`, `and`/`or`, `runGates`, the effect commit queue, the fit-check type atoms, and the scalar catalog gates (`OwnerOnly`, `GuildOnly`, `DmOnly`, `Cooldown`). The gateway keeps its arms (`InteractionGateContext`, `EventGateContext`), the cache-reading gates (`RequireRole`, `RequirePermissions`, `RequireBotPermissions`, `Nsfw`, `IgnoreBots`), and the `@Gated` decorator. Everything stays importable from `seedcord`.

**BREAKING:** `GateContextBase` is scalar: `core` (now `CoreBase`), `userId`, `guildId`, `channelId`, `memberRoleIds`, and `memberPermissions` (channel-scoped on interactions, guild-level on events). The djs `user`/`guild`/`member` objects survive only on the gateway arms, so an agnostic gate reading `ctx.user` must read `ctx.userId` or annotate an arm.
