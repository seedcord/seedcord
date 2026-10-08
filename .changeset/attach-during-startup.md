---
'@seedcord/core': patch
'@seedcord/errors': patch
---

Fixed a plugin attached during startup, like from a startup task, never running its `init()`. `attach` now throws `CorePluginAfterInit` once startup begins.
