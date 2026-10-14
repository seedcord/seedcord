---
'@seedcord/errors': minor
---

Added four codes for `seedcord dev`. `CliEdgeDevPortInUse` covers another process already listening on the wrangler config's `dev.port`, `CliEdgeWranglerMissing` covers an edge project without `wrangler`, and `CliWranglerConfigUnreadable` covers a wrangler config that wrangler cannot parse. `CliDevRuntimeNotRunning` marks a bug in seedcord's dev runtime.
