---
'seedcord': minor
---

`fetchGuildMember`, `fetchRole`, and `fetchText` now rethrow non-404 Discord errors instead of rebranding every failure as not-found. Controllers throw a `SeedcordError` when constructed without a handler path, and `StrictEventEmitter`-backed `Bus.publish` marks `once` subscribers before awaiting so a re-entrant publish cannot run them twice. `throwCustomError` is removed from the public API (its database-error path moved into `@seedcord/plugins`), and several `@internal` types are no longer exported.
