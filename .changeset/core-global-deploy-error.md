---
'@seedcord/core': patch
'@seedcord/errors': minor
---

A global command deploy that Discord refuses at startup now throws `CoreCommandGlobalDeployFailed`, with Discord's error as its cause.
