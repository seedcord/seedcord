---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports.
