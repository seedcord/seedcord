---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

**BREAKING:** the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`.

**BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

**BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.
