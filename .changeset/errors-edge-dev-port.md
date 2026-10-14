---
'@seedcord/errors': minor
---

Added three codes for `seedcord dev` on an edge bot. `CliEdgeDevPortInUse` covers another process already listening on the wrangler config's `dev.port`, `CliEdgeWranglerMissing` covers a project without `wrangler`, and `CliWranglerConfigUnreadable` covers a wrangler config that wrangler cannot parse.
