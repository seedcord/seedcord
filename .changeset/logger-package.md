---
'@seedcord/logger': minor
---

New `@seedcord/logger`. `Logger` assembles a record and routes it through a level gate and two sink layers.

The core has no `node:*` imports and runs in edge workers. The winston console and file sinks come from `@seedcord/logger/node` and is set up automatically during dev.
