---
'@seedcord/core': minor
---

Add `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` to the gate catalog. The permission gates read the payload's effective channel sets by default, and `{ in: 'guild' }` picks the base-set check, which types as `Gate<GuildPermissionsContext>` and fits gateway handlers only. The Administrator bit passes any scope.

**BREAKING:** `GateContextBase` gains a required `appPermissions` field, so a hand-built gate context must add it.
