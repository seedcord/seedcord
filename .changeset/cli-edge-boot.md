---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord build` now starts an edge bot's worker once in workerd after bundling it. A worker that fails to load, like one that sets a timer at global scope, stops the build with `CliEdgeBootFailed` and workerd's error.
