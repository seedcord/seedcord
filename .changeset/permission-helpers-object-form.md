---
'@seedcord/gateway': minor
---

**BREAKING:** `checkPermissions`, `checkBotPermissions` and `hasPermsToAssign` now take one options object, like `checkPermissions({ for: member, in: channel, scope })`. Leave `in` out to check the base set from roles, and pass any channel or thread to check its set.
