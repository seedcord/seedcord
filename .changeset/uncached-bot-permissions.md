---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** A permission check on a bot whose own member isn't cached now throws `CoreBotMemberMissing`, where it used to refuse as if every permission were missing. `RequireBotPermissions` without `in: 'guild'` no longer compiles on an event handler, where it used to refuse every event.
