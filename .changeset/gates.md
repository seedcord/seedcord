---
'seedcord': minor
---

Add declarative preconditions and remove the manual check API.

- `@Gated(...)` runs gate values before a handler. Build gates with `defineGate` and `defineEffectGate`, compose them with `and` and `or`, and use the built-in catalog (`Cooldown`, `OwnerOnly`, `GuildOnly`, `DmOnly`, `Nsfw`, `RequirePermissions`, `RequireBotPermissions`, `RequireRole`, `IgnoreBots`, and their inverses). A gate refuses by throwing a `Notice`.
- `@Checkable`, `WithChecks`, and the user-written `runChecks` are removed.

To migrate, move a reusable check into a `@Gated(...)` gate, or inline a one-off as `throw new SomeNotice()` in `execute()`.
