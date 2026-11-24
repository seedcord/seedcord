---
'seedcord': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed `seedcord dev` asking for a restart each time you save a plugin that your bot file attaches, or a file that the plugin imports. It now disposes the running plugin and starts the saved one in its place, with the arguments you passed to `attach()`.
