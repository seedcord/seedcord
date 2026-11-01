---
'@seedcord/gateway': minor
---

**BREAKING:** `checkPermissions` and `checkBotPermissions` now take one options object, like `checkPermissions({ for: member, in: channel, scope })`. `hasPermsToAssign` no longer takes a bare `Role`, and its options now read `{ role, higher, managed, missing }` where they read `{ targetRole, noticeOverrides }`.
