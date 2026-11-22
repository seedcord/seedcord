---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/utils': patch
---

Fixed three checks on a gateway bot that missed Discord's errors because discord.js loads a different build of `@discordjs/rest` than seedcord does. A deleted log webhook now stops startup with `ConfigWebhookNotFound`, a refused command deploy points at the token or the command fields, and error reports show the interaction's timestamps.
