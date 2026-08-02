---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

**BREAKING:** `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` for the previous base-set behavior. They fit modal and event handlers now.

**BREAKING:** `GateContextBase` is scalar (`userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`, `appPermissions`, `routeId`). A gate that read `ctx.user`, `ctx.guild`, or `ctx.member` reads the id scalars or annotates a gateway arm.

`Cooldown` keys its window by route, so a durable store keeps it across restarts.
