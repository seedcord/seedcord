---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** `PermissionErrorNoticeOverrides` is now `PermissionNoticeOverrides` and comes from `@seedcord/core`.

`assertPermissions` ships on `@seedcord/core` for both transports. The caller passes the effective bitfield and a subject, and gateway's `checkPermissions` computes those from discord.js.
