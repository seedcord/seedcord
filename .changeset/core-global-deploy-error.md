---
'@seedcord/core': patch
'@seedcord/errors': minor
---

`@seedcord/core` now throws `CoreCommandGlobalDeployFailed` when Discord refuses the global commands, with Discord's error as its cause.
