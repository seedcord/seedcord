---
'@seedcord/gateway': minor
---

**BREAKING:** `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` now come from `@seedcord/core` and check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` to keep the previous base-set behavior. The gates now fit modal and event handlers too.

Outside production, the interaction dispatcher now warns when a dispatch's gate checks run past 750ms of the 3s ack budget combined, naming each gate's share.

**BREAKING:** `BotPermissionScope` is renamed `PermissionScope`. The `missing`/`dangerous` notice overrides on `checkPermissions`, `checkBotPermissions`, and `hasPermsToAssign` now construct with `(message, subject, permissionNames)` where `subject` is a pre-rendered mention string. The gate contexts carry `appPermissions` plus the two guild base sets.
