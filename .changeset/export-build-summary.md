---
'seedcord': patch
---

Fixed `seedcord build` saying nothing about how to run a bot when `build.start` is missing. The summary now says that the build only exports your bot, and tells you to set `build.start` to run it with node.
