---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

**BREAKING:** the `bot/utilities` fetch helpers have been removed, along with the `UserNotFound`, `UserNotInGuild`, `RoleDoesNotExist`, and `CouldNotFindChannel` notices. Call discord.js directly, `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`.

`updateMemberRoles` is replaced by `mergeRoles(current, add, remove)` (exported from `@seedcord/core`), which returns the merged ids for you to use.
