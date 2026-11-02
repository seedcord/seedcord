---
'@seedcord/core': minor
---

**BREAKING:** `RequirePermissions` has a new `unresolved` option for the refusal it throws when a member's permissions don't resolve inside a server. That refusal used to come from `notInGuild`.
